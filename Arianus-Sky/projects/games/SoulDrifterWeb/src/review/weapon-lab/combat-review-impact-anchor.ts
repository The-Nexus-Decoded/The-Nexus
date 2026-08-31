import * as THREE from "three";
import { reviewRenderedTriangleIndices, sampleReviewMeshVertices } from "./combat-review-contact";
import type { ReviewActorAdapter, ReviewEvent, ReviewSurfaceAnchor } from "./combat-review-types";

export interface ReviewImpactPose {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
}

export interface ReviewImpactAttachment {
  /** Private immutable copy; later caller/event edits cannot redirect an attachment. */
  readonly event: ReviewEvent;
  sample(position?: THREE.Vector3, quaternion?: THREE.Quaternion): ReviewImpactPose;
  dispose(): void;
}

type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
interface AttributeReceipt { readonly name: string; readonly attribute: Attribute; readonly version: number }

const attributeVersion = (attribute: Attribute) => attribute instanceof THREE.InterleavedBufferAttribute
  ? attribute.data.version : attribute.version;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function finiteTuple(value: readonly number[] | undefined): value is readonly [number, number, number] {
  return !!value && value.length === 3 && value.every(Number.isFinite);
}

function triangleFrame(points: readonly THREE.Vector3[]): THREE.Quaternion | null {
  const x = points[1]!.clone().sub(points[0]!);
  const z = x.clone().cross(points[2]!.clone().sub(points[0]!));
  if (x.lengthSq() <= 1e-14 || z.lengthSq() <= 1e-14) return null;
  x.normalize(); z.normalize();
  const y = z.clone().cross(x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)).normalize();
}

function validateAnchor(value: ReviewSurfaceAnchor | undefined): asserts value is ReviewSurfaceAnchor {
  if (!value || !value.meshId.trim() || !value.geometryId.trim()
    || !Number.isInteger(value.triangleOffset) || value.triangleOffset < 0
    || !finiteTuple(value.vertexIndices) || value.vertexIndices.some((entry) => !Number.isInteger(entry) || entry < 0)
    || !finiteTuple(value.barycentric) || value.barycentric.some((entry) => entry < -1e-6 || entry > 1 + 1e-6)
    || Math.abs(value.barycentric.reduce((sum, entry) => sum + entry, 0) - 1) > 1e-5
    || value.worldTriangle.length !== 3 || value.worldTriangle.some((entry) => !finiteTuple(entry))) {
    throw new Error("Measured impact has no valid immutable surface anchor.");
  }
}

/**
 * Bind one confirmed projectile hit to the exact loaded target triangle. The
 * contact-time world frame preserves the projectile's rigid offset/orientation;
 * later samples use current morph/skin deformation without changing its flight.
 */
export function createReviewImpactAttachment(options: {
  target: ReviewActorAdapter;
  event: ReviewEvent;
  projectilePosition: THREE.Vector3;
  projectileQuaternion: THREE.Quaternion;
}): ReviewImpactAttachment {
  const event = deepFreeze(structuredClone(options.event));
  validateAnchor(event.surfaceAnchor);
  if (event.kind !== "contact" || event.result !== "hit" || !event.projectileId?.trim()
    || event.targetId !== options.target.instanceId || !Number.isFinite(event.timeSeconds)
    || event.timeSeconds < 0 || !event.evidence?.trim()
    || !finiteTuple(event.position) || !finiteTuple(event.normal)
    || ![...options.projectilePosition.toArray(), ...options.projectileQuaternion.toArray()].every(Number.isFinite)
    || Math.abs(options.projectileQuaternion.lengthSq() - 1) > 1e-5) {
    throw new Error("Only a spatially confirmed current-target projectile hit can attach.");
  }
  const anchor = event.surfaceAnchor;
  const object = options.target.model.getObjectByProperty("uuid", anchor.meshId);
  const mesh = object as THREE.Mesh | undefined;
  if (!mesh?.isMesh || mesh.geometry.uuid !== anchor.geometryId) {
    throw new Error("Impact target mesh or geometry no longer matches the measured surface.");
  }
  const indices = reviewRenderedTriangleIndices(mesh, anchor.triangleOffset);
  if (!indices || indices.some((entry, index) => entry !== anchor.vertexIndices[index])) {
    throw new Error("Impact target topology no longer contains the measured triangle.");
  }
  const geometry = mesh.geometry, position = geometry.getAttribute("position"), index = geometry.index;
  const attributes: AttributeReceipt[] = Object.entries(geometry.attributes)
    .map(([name, attribute]) => ({ name, attribute, version: attributeVersion(attribute) }));
  const sourceMorphs = geometry.morphAttributes as Record<string, THREE.BufferAttribute[]>;
  const morphAttributes: AttributeReceipt[] = Object.entries(sourceMorphs).flatMap(([name, rows]) =>
    rows.map((attribute, row) => ({ name: `${name}:${row}`, attribute, version: attributeVersion(attribute) })));
  const confirmedPoints = anchor.worldTriangle.map((entry) => new THREE.Vector3().fromArray(entry));
  const confirmedFrame = triangleFrame(confirmedPoints);
  if (!confirmedFrame) throw new Error("Measured impact triangle is degenerate.");
  const confirmedPoint = new THREE.Vector3();
  confirmedPoints.forEach((point, corner) => confirmedPoint.addScaledVector(point, anchor.barycentric[corner]!));
  if (confirmedPoint.distanceTo(new THREE.Vector3().fromArray(event.position)) > 1e-4
    || confirmedPoints[1]!.clone().sub(confirmedPoints[0]!).cross(confirmedPoints[2]!.clone().sub(confirmedPoints[0]!))
      .normalize().dot(new THREE.Vector3().fromArray(event.normal).normalize()) < 0.99) {
    throw new Error("Measured impact point or normal does not match its triangle receipt.");
  }
  const inverseFrame = confirmedFrame.clone().invert();
  const localOffset = options.projectilePosition.clone().sub(confirmedPoint).applyQuaternion(inverseFrame);
  const localQuaternion = inverseFrame.clone().multiply(options.projectileQuaternion).normalize();
  let disposed = false;
  const assertSource = () => {
    if (disposed) throw new Error("Impact attachment has been disposed.");
    const current = options.target.model.getObjectByProperty("uuid", anchor.meshId) as THREE.Mesh | undefined;
    const exact = current === mesh && mesh.geometry === geometry && geometry.uuid === anchor.geometryId
      && geometry.getAttribute("position") === position && geometry.index === index
      && geometry.morphAttributes === sourceMorphs
      && attributes.every((receipt) => geometry.getAttribute(receipt.name) === receipt.attribute
        && attributeVersion(receipt.attribute) === receipt.version)
      && morphAttributes.every((receipt) => {
        const [name, row] = receipt.name.split(":");
        return sourceMorphs[name!]?.[Number(row)] === receipt.attribute && attributeVersion(receipt.attribute) === receipt.version;
      });
    const currentIndices = exact ? reviewRenderedTriangleIndices(mesh, anchor.triangleOffset) : null;
    if (!currentIndices || currentIndices.some((entry, corner) => entry !== anchor.vertexIndices[corner])) {
      throw new Error("Impact target mesh, source geometry or rendered topology changed.");
    }
  };
  return {
    event,
    sample(targetPosition = new THREE.Vector3(), targetQuaternion = new THREE.Quaternion()) {
      assertSource();
      const points = sampleReviewMeshVertices(mesh, anchor.vertexIndices);
      const frame = triangleFrame(points);
      if (!frame) throw new Error("Impact target triangle collapsed during deformation.");
      const point = new THREE.Vector3();
      points.forEach((value, corner) => point.addScaledVector(value, anchor.barycentric[corner]!));
      targetPosition.copy(localOffset).applyQuaternion(frame).add(point);
      targetQuaternion.copy(frame).multiply(localQuaternion).normalize();
      return { position: targetPosition, quaternion: targetQuaternion };
    },
    dispose() { disposed = true; },
  };
}

/** Run the identical immutable target/surface checks before accepting a hit. */
export function validateReviewImpactSurface(target: ReviewActorAdapter, event: ReviewEvent): void {
  const projectilePosition = finiteTuple(event.position)
    ? new THREE.Vector3().fromArray(event.position)
    : new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  const attachment = createReviewImpactAttachment({ target, event, projectilePosition,
    projectileQuaternion: new THREE.Quaternion() });
  attachment.dispose();
}
