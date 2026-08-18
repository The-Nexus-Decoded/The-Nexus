import * as THREE from "three";
import type { DungeonPropAssetSpec } from "./DungeonPropCatalog";

export interface DungeonPropKitInstance {
  root: THREE.Group;
  fireMount: THREE.Object3D;
  animate(elapsed: number): void;
  dispose(): void;
}

export interface DungeonFireEffect {
  root: THREE.Group;
  setLit(lit: boolean): void;
  isLit(): boolean;
  animate(elapsed: number): void;
  dispose(): void;
}

function clonePropMaterials(model: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clones = sourceMaterials.map((material) => {
      const clone = material.clone();
      materials.push(clone);
      return clone;
    });
    child.material = Array.isArray(child.material) ? clones : clones[0]!;
  });
  return materials;
}

function fitModel(model: THREE.Object3D, spec: DungeonPropAssetSpec): void {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z, 0.001);
  const height = Math.max(size.y, 0.001);
  const uniformScale = Math.min(spec.targetHeight / height, spec.maxFootprint / footprint);
  model.scale.multiplyScalar(Number.isFinite(uniformScale) ? uniformScale : 1);
  model.scale.y *= spec.verticalScale ?? 1;
  model.updateMatrixWorld(true);

  const fittedBounds = new THREE.Box3().setFromObject(model, true);
  const center = fittedBounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= fittedBounds.min.y;
  model.position.z -= center.z;
  model.updateMatrixWorld(true);
}

function addHangingAssembly(root: THREE.Group, model: THREE.Object3D, phase: number): {
  fireMount: THREE.Group;
  animate(elapsed: number): void;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
} {
  const drop = 1.62;
  const pivot = new THREE.Group();
  pivot.name = "hanging-brazier-sway-pivot";
  pivot.position.y = drop;
  const suspended = new THREE.Group();
  suspended.name = "hanging-brazier-fixture";
  suspended.position.y = -drop;
  suspended.add(model);
  pivot.add(suspended);
  root.add(pivot);

  const iron = new THREE.MeshStandardMaterial({ color: 0x211d19, metalness: 0.92, roughness: 0.44 });
  const linkGeometry = new THREE.TorusGeometry(0.07, 0.018, 4, 8);
  const plateGeometry = new THREE.CylinderGeometry(0.26, 0.32, 0.12, 10);
  const plate = new THREE.Mesh(plateGeometry, iron);
  plate.position.y = -0.03;
  plate.castShadow = true;
  pivot.add(plate);

  const topAnchors = [
    new THREE.Vector3(-0.18, -0.08, -0.08),
    new THREE.Vector3(0.18, -0.08, -0.08),
    new THREE.Vector3(0, -0.08, 0.2),
  ];
  const bottomAnchors = [
    new THREE.Vector3(-0.38, -drop + 0.55, -0.18),
    new THREE.Vector3(0.38, -drop + 0.55, -0.18),
    new THREE.Vector3(0, -drop + 0.55, 0.4),
  ];
  for (let chainIndex = 0; chainIndex < topAnchors.length; chainIndex += 1) {
    const top = topAnchors[chainIndex]!;
    const bottom = bottomAnchors[chainIndex]!;
    for (let linkIndex = 0; linkIndex < 9; linkIndex += 1) {
      const link = new THREE.Mesh(linkGeometry, iron);
      link.position.lerpVectors(top, bottom, linkIndex / 8);
      link.rotation.set(Math.PI / 2, chainIndex * 0.7, linkIndex % 2 === 0 ? 0 : Math.PI / 2);
      link.castShadow = true;
      pivot.add(link);
    }
  }

  return {
    fireMount: suspended,
    animate: (elapsed) => {
      pivot.rotation.x = Math.sin(elapsed * 0.58 + phase) * 0.018;
      pivot.rotation.z = Math.sin(elapsed * 0.43 + phase * 1.7) * 0.026;
    },
    geometries: [linkGeometry, plateGeometry],
    materials: [iron],
  };
}

export function instantiateDungeonProp(
  source: THREE.Object3D,
  spec: DungeonPropAssetSpec,
  phase: number,
): DungeonPropKitInstance {
  const root = new THREE.Group();
  root.name = `kit-${spec.id}`;
  const model = source.clone(true);
  model.name = `${spec.id}-model`;
  const clonedMaterials = clonePropMaterials(model);
  fitModel(model, spec);

  let fireMount: THREE.Object3D = root;
  let animate = (_elapsed: number): void => undefined;
  const generatedGeometries: THREE.BufferGeometry[] = [];
  const generatedMaterials: THREE.Material[] = [];
  if (spec.placement === "ceiling") {
    const hanging = addHangingAssembly(root, model, phase);
    fireMount = hanging.fireMount;
    animate = hanging.animate;
    generatedGeometries.push(...hanging.geometries);
    generatedMaterials.push(...hanging.materials);
  } else {
    root.add(model);
  }

  return {
    root,
    fireMount,
    animate,
    dispose: () => {
      clonedMaterials.forEach((material) => material.dispose());
      generatedGeometries.forEach((geometry) => geometry.dispose());
      generatedMaterials.forEach((material) => material.dispose());
    },
  };
}

export function createDungeonFireEffect(input: {
  anchorY: number;
  color: "soul" | "cinder";
  castShadow: boolean;
  phase: number;
}): DungeonFireEffect {
  const palette = input.color === "soul"
    ? { outer: 0x45e5db, inner: 0xd2fff7, light: 0x63eadd, smoke: 0x365654 }
    : { outer: 0xf06b35, inner: 0xffd06b, light: 0xff8a4c, smoke: 0x514238 };
  const root = new THREE.Group();
  root.name = "interactive-fire-effect";
  root.position.y = input.anchorY;

  const outerMaterial = new THREE.MeshBasicMaterial({
    color: palette.outer,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: palette.inner,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: palette.outer,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const outerGeometry = new THREE.ConeGeometry(0.3, 0.76, 7);
  const innerGeometry = new THREE.ConeGeometry(0.16, 0.5, 6);
  const glowGeometry = new THREE.SphereGeometry(0.34, 10, 6);
  const outerFlame = new THREE.Mesh(outerGeometry, outerMaterial);
  outerFlame.position.y = 0.38;
  const innerFlame = new THREE.Mesh(innerGeometry, innerMaterial);
  innerFlame.position.y = 0.28;
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.scale.set(1.35, 0.28, 1.35);
  glow.position.y = 0.08;

  const emberCount = 18;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
  const emberMaterial = new THREE.PointsMaterial({
    color: palette.inner,
    size: 0.055,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const embers = new THREE.Points(emberGeometry, emberMaterial);

  const smokeCount = 12;
  const smokePositions = new Float32Array(smokeCount * 3);
  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
  const smokeMaterial = new THREE.PointsMaterial({
    color: palette.smoke,
    size: 0.2,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);

  const light = new THREE.PointLight(palette.light, 6.8, 10, 1.72);
  light.position.y = 0.42;
  light.castShadow = input.castShadow;
  light.shadow.mapSize.set(256, 256);
  light.shadow.bias = -0.0012;
  root.add(glow, outerFlame, innerFlame, embers, smoke, light);

  let lit = true;
  const setLit = (next: boolean): void => {
    lit = next;
    root.visible = next;
    light.visible = next;
    light.castShadow = next && input.castShadow;
  };

  const updateParticles = (elapsed: number): void => {
    for (let index = 0; index < emberCount; index += 1) {
      const cycle = (elapsed * 0.52 + index / emberCount + input.phase * 0.07) % 1;
      const angle = index * 2.399 + input.phase + elapsed * 0.18;
      const radius = 0.05 + cycle * 0.2;
      emberPositions[index * 3] = Math.cos(angle) * radius;
      emberPositions[index * 3 + 1] = 0.16 + cycle * 1.18;
      emberPositions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    emberGeometry.attributes.position!.needsUpdate = true;
    for (let index = 0; index < smokeCount; index += 1) {
      const cycle = (elapsed * 0.19 + index / smokeCount + input.phase * 0.05) % 1;
      const angle = index * 1.71 + input.phase;
      smokePositions[index * 3] = Math.cos(angle) * cycle * 0.24 + Math.sin(elapsed * 0.7 + index) * 0.04;
      smokePositions[index * 3 + 1] = 0.5 + cycle * 1.45;
      smokePositions[index * 3 + 2] = Math.sin(angle) * cycle * 0.24;
    }
    smokeGeometry.attributes.position!.needsUpdate = true;
  };

  return {
    root,
    setLit,
    isLit: () => lit,
    animate: (elapsed) => {
      if (!lit) return;
      const flicker = Math.sin(elapsed * 10.7 + input.phase) * 0.08 + Math.sin(elapsed * 17.3) * 0.035;
      outerFlame.scale.set(1 - flicker * 0.35, 1 + flicker, 1 - flicker * 0.35);
      innerFlame.scale.set(0.92 + flicker * 0.3, 1.08 - flicker * 0.55, 0.92 + flicker * 0.3);
      outerFlame.rotation.y = elapsed * 1.15 + input.phase;
      innerFlame.rotation.y = -elapsed * 1.7;
      glowMaterial.opacity = 0.3 + flicker * 0.42;
      light.intensity = 6.8 + flicker * 7.5;
      updateParticles(elapsed);
    },
    dispose: () => {
      outerGeometry.dispose();
      innerGeometry.dispose();
      glowGeometry.dispose();
      emberGeometry.dispose();
      smokeGeometry.dispose();
      outerMaterial.dispose();
      innerMaterial.dispose();
      glowMaterial.dispose();
      emberMaterial.dispose();
      smokeMaterial.dispose();
    },
  };
}
