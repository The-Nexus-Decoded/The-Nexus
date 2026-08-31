import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import {
  centerStaffVisual, fitStaffToSourceHands, staffUsesSupportHand,
  fitCasterStaffHand, fitMaceBlockSupport, maceUsesSupportHand,
} from "./staff-grip.js";
import { buildStaffFightingClips } from "./staff-moves.js";
import { locomotionActions, buildCarryLocomotionClips } from "./weapon-locomotion.js";
import { applyAdditiveHumanHandGrip, solveGreatswordSupportGrip } from "../../game/humanWeaponCalibration.ts";
import {
  URLS, BOW_TRIPLE_SHOT_NAME, BOW_AIM_RUN_NAME, BOW_QUIVER_DRAW_NAME, BOW_RELEASE_NAME,
  BOW_STRIKE_NAME, GREATSWORD_TWO_HAND_SHEATHE_NAME, ACTIONS, GREATSWORD_BACK_TRANSITIONS,
  ACTION_PRESETS, ASSET_SPECS, LOADOUTS, OPEN_GRIP, FITTED_HAND_GRIP, FITTED_GRIP_LOADOUTS,
  LOADOUT_GRIP_PRESETS, PREVIEW_TEXTURE_URLS, REQUIRED_PREVIEW_TEXTURE_ASSETS,
  RUN_DIVE_GAP_NAME, AUTHORED_GAP_LABELS, CATALOG_LOADOUT, TARGET_HEIGHT_METERS,
  sourcePrefix, clipActionName, isAttackClip, isDefenseClip, isLocomotionClip,
  isMagicClip, isReactionClip, isDeathClip, isIdleClip, sourceResponseActions,
} from "./human-review-catalog.js";

function normalizeBoneName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findBone(bones, suffix) {
  const wanted = normalizeBoneName(`mixamorig${suffix}`);
  return [...bones.values()].find((bone) => normalizeBoneName(bone.name) === wanted)
    ?? [...bones.values()].find((bone) => normalizeBoneName(bone.name).endsWith(normalizeBoneName(suffix)));
}


/**
 * Shared immutable source cache; every actor owns its skeleton, mixer, material
 * instances, equipment and calibration. Dispose the factory only after all of
 * its actors are no longer needed; actor disposal never releases shared data.
 *
 * create({ instanceId, loadoutId, mode: "equipment" | "catalog" }) needs no DOM.
 * sample(id, clipSeconds) is absolute and repeatable; update(delta) is the solo
 * player's optional clock. includeSourceResponses opts equipment actors into
 * explicitly labeled source response candidates, never equipment/contact approval.
 */
export function createHumanReviewActorFactory({
  loader = new GLTFLoader(), textureLoader = new THREE.TextureLoader(), maxAnisotropy = 1,
} = {}) {
  const models = new Map();
  const textures = new Map();
  const cachedResources = new Set();
  const releasedCacheResources = new Set();
  const instances = new Set();
  let factoryDisposed = false;
  let sharedClips = null;
  let sharedAuthoredCount = 0;
  function releaseCacheResource(resource) {
    if (releasedCacheResources.has(resource)) return;
    releasedCacheResources.add(resource);
    resource.dispose?.();
  }
  function rememberResources(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) cachedResources.add(object.geometry);
      for (const material of (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean)) {
        cachedResources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) cachedResources.add(value);
      }
    });
    if (factoryDisposed) for (const resource of cachedResources) releaseCacheResource(resource);
  }
  function loadModel(url) {
    if (!models.has(url)) {
      const pending = loader.loadAsync(url).then((gltf) => { rememberResources(gltf.scene); return gltf; });
      models.set(url, pending);
      pending.catch(() => { if (models.get(url) === pending) models.delete(url); });
    }
    return models.get(url);
  }
  function loadTexture(url) {
    if (!textures.has(url)) {
      const pending = textureLoader.loadAsync(url).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.anisotropy = Math.min(8, maxAnisotropy);
        cachedResources.add(texture);
        if (factoryDisposed) releaseCacheResource(texture);
        return texture;
      });
      textures.set(url, pending);
      pending.catch(() => { if (textures.get(url) === pending) textures.delete(url); });
    }
    return textures.get(url);
  }
  async function create(options = {}) {
    if (factoryDisposed) throw new Error("Human review factory is disposed.");
    if (!options.instanceId) throw new Error("Human review actors require an instanceId.");
    if (options.mode !== undefined && options.mode !== "equipment" && options.mode !== "catalog") throw new Error("Unknown human review mode.");
    if (options.includeSourceResponses !== undefined && typeof options.includeSourceResponses !== "boolean") throw new Error("Source response review must be explicitly enabled or disabled.");
    if (!LOADOUTS[options.loadoutId ?? "longswordTwoHand"]) throw new Error(`Unknown human loadout: ${options.loadoutId}`);
    const [body, library, extras] = await Promise.all([
      loadModel(URLS.body), loadModel(URLS.animations), loadModel(URLS.locomotionExtras),
    ]);
    if (factoryDisposed) throw new Error("Human review factory was disposed during loading.");
    const sourceClips = [...library.animations, ...extras.animations];
    if (new Set(sourceClips.map((clip) => clip.name)).size !== sourceClips.length) {
      throw new Error("Duplicate source animation names in locomotion addendum");
    }
    const actor = createInstance(body.scene, sourceClips, options);
    instances.add(actor);
    try {
      if (!options.deferLoadout) await actor.setLoadout(options.loadoutId ?? "longswordTwoHand", { mode: options.mode ?? "equipment" });
      if (factoryDisposed) throw new Error("Human review factory was disposed during loading.");
      return actor;
    } catch (error) {
      actor.dispose();
      throw error;
    }
  }
  function dispose() {
    if (factoryDisposed) return;
    factoryDisposed = true;
    for (const actor of [...instances]) actor.dispose();
    for (const resource of cachedResources) releaseCacheResource(resource);
    models.clear(); textures.clear();
  }
  function createInstance(bodySource, sourceClips, options) {
    const includeSourceResponses = options.includeSourceResponses === true;
    const scene = new THREE.Group();
    scene.name = `human-review:${options.instanceId}`;
    const settings = {
      mode: options.mode ?? "equipment", loadoutId: options.loadoutId ?? "longswordTwoHand",
      normalizedTime: 0, arrowCount: 100, staffGrip: { spread: 0, roll: 0 },
      calibration: null,
    };
    const twoHandGripTarget = new THREE.Vector3(-0.024, -0.09, 0.016);
    const twoHandWristCorrection = new THREE.Euler(0.4, 0, 0, "XYZ");
    const actionCalibrationStates = new Map();
    const releasedInstanceResources = new Set();
    let preparedAssets = new Map();
    let equipmentBaseline = [];
    let disposed = false;
    let revision = 0;
    let playing = true;
    let speed = 1;
    let loop = true;
    let activeActionCalibrationKey = null;
    function assertAlive() { if (disposed) throw new Error("Human review actor is disposed."); }
    function localizeWorldTransform(object) {
      object.parent?.updateWorldMatrix(true, false);
      const world = new THREE.Matrix4().compose(object.position, object.quaternion, object.scale);
      if (object.parent) world.premultiply(object.parent.matrixWorld.clone().invert());
      world.decompose(object.position, object.quaternion, object.scale);
    }
    function stripHelpers(model) {
      const helpers = [];
      model.traverse((object) => {
        if (object.isCamera || object.isLight || (/^(?:Cube|Icosphere)$/i.test(object.name) && !object.isSkinnedMesh)) {
          helpers.push(object);
        } else if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      helpers.forEach((helper) => helper.removeFromParent());
    }

    function collectPoints(model, limit = 24000, includeMesh = () => true) {
      model.updateMatrixWorld(true);
      const points = [];
      const point = new THREE.Vector3();
      model.traverse((object) => {
        const position = object.geometry?.attributes?.position;
        if (!object.isMesh || !position || !includeMesh(object)) return;
        const stride = Math.max(1, Math.ceil(position.count / limit));
        for (let index = 0; index < position.count; index += stride) {
          points.push(point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld).clone());
        }
      });
      return points;
    }

    function principalAxis(points) {
      const mean = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
      let xx = 0; let xy = 0; let xz = 0; let yy = 0; let yz = 0; let zz = 0;
      for (const point of points) {
        const x = point.x - mean.x; const y = point.y - mean.y; const z = point.z - mean.z;
        xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z;
      }
      let axis = new THREE.Vector3(0.4, 1, 0.2).normalize();
      for (let iteration = 0; iteration < 16; iteration += 1) {
        axis = new THREE.Vector3(
          xx * axis.x + xy * axis.y + xz * axis.z,
          xy * axis.x + yy * axis.y + yz * axis.z,
          xz * axis.x + yz * axis.y + zz * axis.z,
        ).normalize();
      }
      return axis;
    }

    function principalAxisUnsigned(vectors) {
      let xx = 0; let xy = 0; let xz = 0; let yy = 0; let yz = 0; let zz = 0;
      for (const vector of vectors) {
        xx += vector.x * vector.x; xy += vector.x * vector.y; xz += vector.x * vector.z;
        yy += vector.y * vector.y; yz += vector.y * vector.z; zz += vector.z * vector.z;
      }
      let axis = new THREE.Vector3(0.3, 0.5, 1).normalize();
      for (let iteration = 0; iteration < 16; iteration += 1) {
        axis = new THREE.Vector3(
          xx * axis.x + xy * axis.y + xz * axis.z,
          xy * axis.x + yy * axis.y + yz * axis.z,
          xz * axis.x + yz * axis.y + zz * axis.z,
        ).normalize();
      }
      return axis;
    }

    function collectNormals(model, limit = 24000) {
      model.updateMatrixWorld(true);
      const normals = [];
      const normal = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3();
      model.traverse((object) => {
        const attribute = object.geometry?.attributes?.normal;
        if (!object.isMesh || !attribute) return;
        normalMatrix.getNormalMatrix(object.matrixWorld);
        const stride = Math.max(1, Math.ceil(attribute.count / limit));
        for (let index = 0; index < attribute.count; index += stride) {
          normals.push(normal.fromBufferAttribute(attribute, index).applyNormalMatrix(normalMatrix).normalize().clone());
        }
      });
      return normals;
    }

    function endRadius(points, bounds, atMaximum) {
      const band = (bounds.max.y - bounds.min.y) * 0.24;
      const selected = points.filter((point) => atMaximum ? point.y >= bounds.max.y - band : point.y <= bounds.min.y + band);
      if (!selected.length) return 0;
      return selected.reduce((sum, point) => sum + Math.hypot(point.x, point.z), 0) / selected.length;
    }

    function prepareAsset(source, assetName) {
      const spec = ASSET_SPECS[assetName];
      const visual = source.clone(true);
      stripHelpers(visual);
      if (spec.canonical) {
        visual.name = `${assetName}-visual`;
        visual.updateMatrixWorld(true);
        return {
          visual,
          sourceLength: spec.targetLength,
          targetLength: spec.targetLength,
          normalizedBounds: new THREE.Box3().setFromObject(visual, true),
        };
      }

      const wrapper = new THREE.Group();
      wrapper.name = `${assetName}-normalized`;
      wrapper.add(visual);
      const sourcePoints = collectPoints(visual);
      if (spec.planar) {
        const normalAxis = principalAxisUnsigned(collectNormals(visual));
        visual.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(normalAxis, new THREE.Vector3(0, 0, 1)));
        visual.updateMatrixWorld(true);
        const verticalAxis = principalAxis(collectPoints(visual));
        verticalAxis.z = 0;
        if (verticalAxis.lengthSq() > 0.0001) {
          visual.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(verticalAxis.normalize(), new THREE.Vector3(0, 1, 0)));
        }
        visual.traverse((object) => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          const replacements = materials.map((material) => {
            const replacement = material.clone();
            replacement.side = THREE.DoubleSide;
            return replacement;
          });
          object.material = Array.isArray(object.material) ? replacements : replacements[0];
        });
      } else {
        const align = new THREE.Quaternion().setFromUnitVectors(principalAxis(sourcePoints), new THREE.Vector3(0, 1, 0));
        visual.quaternion.premultiply(align);
      }
      visual.updateMatrixWorld(true);
      let points = collectPoints(visual).map((point) => point.clone());
      let bounds = new THREE.Box3().setFromPoints(points);
      const minRadius = endRadius(points, bounds, false);
      const maxRadius = endRadius(points, bounds, true);
      const largeEndIsMaximum = maxRadius > minRadius;
      const sourceCenter = bounds.getCenter(new THREE.Vector3());
      const guardPoint = spec.gripEnd === "hilt" ? points.reduce((widest, point) => (
        Math.hypot(point.x - sourceCenter.x, point.z - sourceCenter.z)
          > Math.hypot(widest.x - sourceCenter.x, widest.z - sourceCenter.z) ? point : widest
      )) : null;
      // A sword's narrowest end is the blade tip, not its handle. The crossguard
      // sits close to the pommel end; orient that end downward before grip anchoring.
      const shouldFlip = !spec.planar && ((spec.gripEnd === "large" && largeEndIsMaximum)
        || (spec.gripEnd === "small" && !largeEndIsMaximum)
        || (guardPoint && guardPoint.y > sourceCenter.y));
      if (shouldFlip) {
        if (spec.gripEnd === "hilt") {
          // Flip in normalized world axes, not the generated root's original axes.
          visual.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));
        } else visual.rotateZ(Math.PI);
        visual.updateMatrixWorld(true);
        points = collectPoints(visual).map((point) => point.clone());
        bounds = new THREE.Box3().setFromPoints(points);
      }

      const sourceLength = bounds.max.y - bounds.min.y;
      const scale = spec.targetLength / sourceLength;
      visual.scale.multiplyScalar(scale);
      visual.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(visual, true);
      const center = bounds.getCenter(new THREE.Vector3());
      const anchorY = THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, spec.gripFraction);
      visual.position.x -= center.x;
      visual.position.y -= anchorY;
      visual.position.z -= center.z;
      visual.updateMatrixWorld(true);
      if (spec.radialScale) wrapper.scale.set(spec.radialScale, 1, spec.radialScale);
      const normalizedBounds = new THREE.Box3().setFromObject(wrapper, true);
      return { visual: wrapper, sourceLength, targetLength: spec.targetLength, normalizedBounds };
    }

    function createActor(bodySource, clips) {
      const model = cloneSkeleton(bodySource);
      const materialCopies = new Map();
      model.traverse((object) => {
        if (!object.isMesh) return;
        const cloneMaterial = (material) => {
          if (!materialCopies.has(material)) materialCopies.set(material, material.clone());
          return materialCopies.get(material);
        };
        object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
      });
      stripHelpers(model);
      const bounds = new THREE.Box3().setFromObject(model, true);
      model.scale.setScalar(TARGET_HEIGHT_METERS / (bounds.max.y - bounds.min.y));
      scene.add(model);
      const bones = new Map();
      model.traverse((object) => { if (object.isBone) bones.set(object.name, object); });
      return {
        model,
        bones,
        bindFingerQuaternions: new Map([...bones].filter(([name]) => /Hand(Index|Middle|Ring|Pinky|Thumb)/.test(name))
          .map(([name, bone]) => [name, bone.quaternion.clone()])),
        mixer: new THREE.AnimationMixer(model),
        clips: new Map(clips.map((clip) => [clip.name, clip])),
        sourceClipCount: clips.length,
        authoredGapCount: 0,
        sockets: [],
        primary: null,
        action: null,
        overlay: new Map(),
        fittedOverlayBase: new Map(),
        ikBase: new Map(),
        bowIKBase: new Map(),
        bowString: null,
        arrowBundle: null,
        quiverHarness: null,
        handArrowExtras: [],
        projectile: null,
      };
    }

    function buildRunDiveWaterEntryGap(actor) {
      const sourceNames = {
        run: "MaleLocomotion__StandardRun",
        dive: "ProMeleeAxe__UnarmedJumpRunning",
        swim: "Interactions__HumanMasculineAthleticMuscularSwimForwardLoop",
      };
      const sources = Object.fromEntries(Object.entries(sourceNames).map(([phase, clipName]) => {
        const clip = actor.clips.get(clipName);
        if (!clip) throw new Error(`Cannot author ${RUN_DIVE_GAP_NAME}: missing ${phase} source ${clipName}.`);
        return [phase, clip];
      }));

      const sampleModel = cloneSkeleton(actor.model);
      const sampleMixer = new THREE.AnimationMixer(sampleModel);
      const actions = Object.fromEntries(Object.entries(sources).map(([phase, clip]) => {
        const action = sampleMixer.clipAction(clip);
        action.enabled = true;
        action.play();
        return [phase, action];
      }));
      const bones = [];
      sampleModel.traverse((object) => { if (object.isBone) bones.push(object); });

      const duration = 3.2;
      const framesPerSecond = 30;
      const sampleCount = Math.round(duration * framesPerSecond) + 1;
      const times = [];
      const positions = new Map(bones.map((bone) => [bone.name, []]));
      const quaternions = new Map(bones.map((bone) => [bone.name, []]));
      const fade = (value) => THREE.MathUtils.smoothstep(value, 0, 1);

      for (let frame = 0; frame < sampleCount; frame += 1) {
        const time = Math.min(frame / framesPerSecond, duration);
        const runToDive = fade((time - 1.05) / 0.3);
        const diveToSwim = fade((time - 2.05) / 0.3);
        const weights = {
          run: 1 - runToDive,
          dive: runToDive * (1 - diveToSwim),
          swim: diveToSwim,
        };
        actions.run.time = ((time / 0.88) % 1) * sources.run.duration;
        actions.dive.time = THREE.MathUtils.clamp((time - 1.05) / 1.3, 0, 1) * sources.dive.duration;
        actions.swim.time = ((Math.max(0, time - 2.05) / 1.05) % 1) * sources.swim.duration;
        for (const [phase, action] of Object.entries(actions)) action.setEffectiveWeight(weights[phase]);
        sampleMixer.update(0);
        times.push(time);
        for (const bone of bones) {
          positions.get(bone.name).push(...bone.position.toArray());
          quaternions.get(bone.name).push(...bone.quaternion.toArray());
        }
      }

      const tracks = [];
      for (const bone of bones) {
        tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, positions.get(bone.name)));
        tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, quaternions.get(bone.name)));
      }
      sampleMixer.stopAllAction();
      sampleMixer.uncacheRoot(sampleModel);
      const clip = new THREE.AnimationClip(RUN_DIVE_GAP_NAME, duration, tracks);
      clip.userData = {
        status: "draft",
        gap: "continuous unarmed run-up, forward dive, and transition into a forward swim",
        sources: Object.values(sourceNames),
      };
      clip.optimize();
      return clip;
    }

    function buildBowThreeArrowMultishot(actor) {
      const sourceName = "Interactions__HumanMasculineAthleticMuscularBowShoot";
      const source = actor.clips.get(sourceName);
      if (!source) throw new Error(`Cannot author ${BOW_TRIPLE_SHOT_NAME}: missing source ${sourceName}.`);
      const clip = source.clone();
      clip.name = BOW_TRIPLE_SHOT_NAME;
      clip.userData = {
        status: "draft",
        gap: "three arrows visibly drawn from the quiver, nocked together, and released in a spread",
        sources: [sourceName],
      };
      return clip;
    }

    function buildBowAimRunForward(actor) {
      const runName = "ProLongbow__StandingRunForward";
      const aimName = "ProLongbow__StandingAimWalkForward";
      const run = actor.clips.get(runName);
      const aim = actor.clips.get(aimName);
      if (!run || !aim) throw new Error(`Cannot author ${BOW_AIM_RUN_NAME}: missing ${!run ? runName : aimName}.`);
      const upperBodyTrack = (track) => /Spine|Neck|Head|Shoulder|Arm|ForeArm|Hand/i.test(track.name);
      const tracks = run.tracks.filter((track) => !upperBodyTrack(track)).map((track) => track.clone());
      for (const sourceTrack of aim.tracks.filter(upperBodyTrack)) {
        const track = sourceTrack.clone();
        track.scale(run.duration / aim.duration);
        tracks.push(track);
      }
      const clip = new THREE.AnimationClip(BOW_AIM_RUN_NAME, run.duration, tracks);
      clip.userData = {
        status: "draft",
        gap: "forward bow run with the upper body maintaining a nocked, drawn aiming pose",
        sources: [runName, aimName],
      };
      clip.optimize();
      return clip;
    }

    function buildBowQuiverDrawToNock(actor) {
      const sourceName = "Interactions__HumanMasculineAthleticMuscularBowDrawArrow";
      const source = actor.clips.get(sourceName);
      if (!source) throw new Error(`Cannot author ${BOW_QUIVER_DRAW_NAME}: missing source ${sourceName}.`);
      const clip = source.clone();
      clip.name = BOW_QUIVER_DRAW_NAME;
      clip.userData = {
        status: "draft",
        gap: "drive the elbow back, grip the fletching, withdraw beside the head, lower the held arrow to the waist, then present and nock",
        sources: [sourceName],
      };
      return clip;
    }

    function buildBowReleaseFromNock(actor) {
      const sourceName = "Interactions__HumanMasculineAthleticMuscularBowShoot";
      const source = actor.clips.get(sourceName);
      if (!source) throw new Error(`Cannot author ${BOW_RELEASE_NAME}: missing source ${sourceName}.`);
      const framesPerSecond = 30;
      const startFrame = Math.floor(source.duration * 0.48 * framesPerSecond);
      const endFrame = Math.ceil(source.duration * 0.82 * framesPerSecond);
      const clip = THREE.AnimationUtils.subclip(source, BOW_RELEASE_NAME, startFrame, endFrame, framesPerSecond);
      clip.userData = {
        status: "draft",
        gap: "release and follow-through from an already-nocked arrow without a second quiver retrieval",
        sources: [sourceName],
      };
      return clip;
    }

    function buildBowCloseRangeStrike(actor) {
      const sourceName = "Interactions__HumanMasculineAthleticMuscularStaffButtSmash";
      const source = actor.clips.get(sourceName);
      if (!source) throw new Error(`Cannot author ${BOW_STRIKE_NAME}: missing source ${sourceName}.`);
      const clip = source.clone();
      clip.name = BOW_STRIKE_NAME;
      clip.userData = {
        status: "draft",
        gap: "close-range bow-body strike used when an enemy is inside the minimum safe ranged distance",
        sources: [sourceName],
        combat: {
          role: "close-range-fallback",
          contactNormalizedTime: 0.52,
          alternatives: ["swap-to-melee"],
        },
      };
      return clip;
    }

    function buildGreatswordTwoHandSheathe(actor) {
      const sourceName = "GreatSword__GreatSwordIdle";
      const source = actor.clips.get(sourceName);
      if (!source) throw new Error(`Cannot author ${GREATSWORD_TWO_HAND_SHEATHE_NAME}: missing source ${sourceName}.`);
      const duration = 4;
      const timeScale = duration / source.duration;
      const tracks = source.tracks.map((sourceTrack) => {
        const track = sourceTrack.clone();
        track.scale(timeScale);
        return track;
      });
      const clip = new THREE.AnimationClip(GREATSWORD_TWO_HAND_SHEATHE_NAME, duration, tracks);
      clip.userData = {
        status: "draft",
        gap: "dedicated four-second two-hand transfer: guard, dominant-shoulder lift, blade turn, then slow guided back insertion",
        sources: [sourceName],
      };
      clip.optimize();
      return clip;
    }

    function addAuthoredGapClips(actor) {
      const clips = [
        buildRunDiveWaterEntryGap(actor),
        buildBowThreeArrowMultishot(actor),
        buildBowAimRunForward(actor),
        buildBowQuiverDrawToNock(actor),
        buildBowReleaseFromNock(actor),
        buildBowCloseRangeStrike(actor),
        buildGreatswordTwoHandSheathe(actor),
        ...buildStaffFightingClips(actor),
      ];
      for (const clip of clips) actor.clips.set(clip.name, clip);
      actor.authoredGapCount = clips.length;
    }

    function buildArrowBundle(actor, preparedAssets) {
      actor.arrowBundle = null;
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && /quiver/i.test(asset));
      const config = LOADOUTS.bow.arrowBundle;
      const bone = findBone(actor.bones, config.bone);
      if (!quiver || !bone || !preparedAssets.has("arrow")) return;
      const preparedArrow = preparedAssets.get("arrow");
      const socket = new THREE.Group();
      socket.name = "inventory-socket-arrow-bundle";
      socket.scale.setScalar(1 / actor.model.scale.x);
      socket.position.fromArray(config.position).multiplyScalar(1 / actor.model.scale.x);
      socket.rotation.fromArray(config.rotation);
      bone.add(socket);
      preparedArrow.visual.updateMatrixWorld(true);
      const rootInverse = preparedArrow.visual.matrixWorld.clone().invert();
      const meshes = [];
      preparedArrow.visual.traverse((sourceMesh) => {
        if (!sourceMesh.isMesh) return;
        const geometry = sourceMesh.geometry.clone();
        geometry.applyMatrix4(rootInverse.clone().multiply(sourceMesh.matrixWorld));
        const fill = new THREE.InstancedMesh(geometry, sourceMesh.material, config.capacity);
        fill.name = `arrow-bundle-real-arrow-${meshes.length}`;
        fill.castShadow = false;
        fill.receiveShadow = false;
        fill.frustumCulled = false;
        fill.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        meshes.push(fill);
      });
      if (!meshes.length) throw new Error("The textured arrow source has no renderable mesh for the quiver fill.");

      const placement = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      const arrowheadDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const quiverBounds = quiver.prepared.normalizedBounds;
      const arrowBounds = preparedArrow.normalizedBounds;
      const arrowBaseY = quiverBounds.min.y + 0.025 + arrowBounds.max.y;
      const placements = [];
      for (let index = 0; index < config.capacity; index += 1) {
        const radius = 0.003 + 0.019 * Math.sqrt((index + 0.5) / config.capacity);
        const angle = index * goldenAngle;
        position.set(Math.cos(angle) * radius, arrowBaseY + (index % 5) * 0.0015, Math.sin(angle) * radius);
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle * 0.12).multiply(arrowheadDown);
        placement.compose(position, rotation, scale);
        for (const fill of meshes) fill.setMatrixAt(index, placement);
        placements.push(position.clone());
      }
      for (const fill of meshes) fill.instanceMatrix.needsUpdate = true;
      socket.add(...meshes);
      actor.arrowBundle = {
        socket,
        bone: config.bone,
        meshes,
        placements,
        quiverOpeningLocal: new THREE.Vector3(0, quiverBounds.max.y - 0.012, 0),
        // The approved arrow points +Y in hand and is flipped head-down only for
        // storage. Grip the lower half of the fletching, where the pinched fingers
        // can actually reach without sliding beside the feathers.
        pickupLocal: new THREE.Vector3(0, arrowBaseY - arrowBounds.min.y - 0.14, 0),
        arrowBounds: arrowBounds.clone(),
        clearExtractionMeters: quiverBounds.getSize(new THREE.Vector3()).y + 0.1,
        bundleRadiusMeters: 0.022,
        localSignature: placements.map((value) => value.toArray().map((component) => component.toFixed(5)).join(",")).join("|"),
        totalInventory: 0,
        displayedInQuiver: 0,
        handArrowVisible: false,
      };
    }

    function disposeArrowBundle(actor) {
      if (!actor.arrowBundle) return;
      for (const mesh of actor.arrowBundle.meshes) {
        mesh.geometry.dispose();
      }
      actor.arrowBundle.socket.removeFromParent();
      actor.arrowBundle = null;
    }

    function buildQuiverHarness(actor) {
      actor.quiverHarness = null;
      const harness = actor.sockets.find(({ role, asset }) => role === "harness" && asset === "harness");
      if (!harness) return;
      harness.visual.removeFromParent();
      const visual = new THREE.Group();
      visual.name = "body-conforming-off-shoulder-quiver-harness";
      const material = new THREE.MeshStandardMaterial({
        color: 0x5c2d1c,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      const strapNames = ["off-shoulder-sling"];
      const straps = strapNames.map((name) => {
        const geometry = new THREE.BufferGeometry();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `quiver-harness-strap-${name}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        visual.add(mesh);
        return mesh;
      });
      harness.socket.add(visual);
      harness.visual = visual;
      harness.visible = true;
      actor.quiverHarness = {
        mesh: visual,
        harness,
        straps,
        sampledPoints: [],
        integratedAsset: true,
        strapCount: straps.length,
      };
      updateQuiverHarness(actor);
    }

    function harnessPath(controlPoints, samples = 48) {
      return new THREE.CatmullRomCurve3(controlPoints, false, "centripetal").getPoints(samples);
    }

    function updateHarnessRibbon(mesh, socket, centerlineWorld, torsoCenterWorld, torsoUpWorld, widthMeters = 0.026) {
      const positions = [];
      const indices = [];
      const halfWidth = widthMeters * 0.5;
      for (let index = 0; index < centerlineWorld.length; index += 1) {
        const previous = centerlineWorld[Math.max(0, index - 1)];
        const next = centerlineWorld[Math.min(centerlineWorld.length - 1, index + 1)];
        const tangent = next.clone().sub(previous).normalize();
        const surfaceNormal = centerlineWorld[index].clone().sub(torsoCenterWorld);
        surfaceNormal.addScaledVector(torsoUpWorld, -surfaceNormal.dot(torsoUpWorld)).normalize();
        const across = new THREE.Vector3().crossVectors(surfaceNormal, tangent).normalize();
        if (across.lengthSq() < 1e-8) across.copy(bodyDirection(new THREE.Vector3(1, 0, 0)));
        const left = socket.worldToLocal(centerlineWorld[index].clone().addScaledVector(across, halfWidth));
        const right = socket.worldToLocal(centerlineWorld[index].clone().addScaledVector(across, -halfWidth));
        positions.push(...left.toArray(), ...right.toArray());
        if (index < centerlineWorld.length - 1) {
          const vertex = index * 2;
          indices.push(vertex, vertex + 2, vertex + 1, vertex + 1, vertex + 2, vertex + 3);
        }
      }
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      mesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      mesh.geometry.setIndex(indices);
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    }

    function updateQuiverHarness(actor) {
      const state = actor.quiverHarness;
      const harness = state?.harness;
      if (!harness || state.straps?.length !== 1) return;
      actor.model.updateMatrixWorld(true);
      harness.socket.updateWorldMatrix(true, true);
      const leftShoulder = findBone(actor.bones, "LeftShoulder")?.getWorldPosition(new THREE.Vector3());
      const rightShoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3());
      const spine1 = findBone(actor.bones, "Spine1")?.getWorldPosition(new THREE.Vector3());
      const spine2 = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3());
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
      if (!leftShoulder || !rightShoulder || !spine1 || !spine2 || !quiver) return;
      const right = rightShoulder.clone().sub(leftShoulder).normalize();
      const torsoUp = spine2.clone().sub(spine1).normalize();
      const modelForward = bodyDirection(new THREE.Vector3(0, 0, 1));
      const forward = new THREE.Vector3().crossVectors(torsoUp, right).normalize();
      if (forward.dot(modelForward) < 0) forward.negate();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      if (up.dot(torsoUp) < 0) up.negate();
      const back = forward.clone().negate();
      const chestCenter = spine1.clone().lerp(spine2, 0.35);
      const topRight = rightShoulder.clone().addScaledVector(up, 0.012);
      const lowerLeft = chestCenter.clone().addScaledVector(right, -0.17).addScaledVector(up, -0.2);
      const frontTorsoDepth = 0.185;
      const lowerTorsoDepth = 0.16;
      const shoulderFront = topRight.clone()
        .addScaledVector(forward, 0.145)
        .addScaledVector(right, 0.025);
      const diagonalUpper = chestCenter.clone()
        .addScaledVector(right, 0.045)
        .addScaledVector(up, 0.055)
        .addScaledVector(forward, frontTorsoDepth);
      const diagonalLower = chestCenter.clone()
        .addScaledVector(right, -0.07)
        .addScaledVector(up, -0.075)
        .addScaledVector(forward, frontTorsoDepth);
      const quiverUpper = quiver.socket.localToWorld(new THREE.Vector3(0, 0.15, 0));
      const quiverLower = quiver.socket.localToWorld(new THREE.Vector3(0, -0.15, 0));
      const routes = [
        [
          quiverUpper,
          topRight.clone().addScaledVector(back, 0.09).addScaledVector(right, 0.02),
          topRight.clone().addScaledVector(back, 0.055).addScaledVector(right, 0.06),
          topRight.clone().addScaledVector(right, 0.085),
          topRight.clone().addScaledVector(forward, 0.055).addScaledVector(right, 0.06),
          shoulderFront,
          diagonalUpper,
          diagonalLower,
          lowerLeft.clone().addScaledVector(forward, lowerTorsoDepth),
          lowerLeft.clone().addScaledVector(right, -0.055),
          lowerLeft.clone().addScaledVector(back, lowerTorsoDepth),
          quiverLower,
        ],
      ];
      routes.forEach((route, index) => updateHarnessRibbon(
        state.straps[index],
        harness.socket,
        harnessPath(route),
        chestCenter,
        up,
      ));
      state.fitDiagnostic = {
        style: "single-off-shoulder-sling",
        torsoUpAlignment: up.dot(torsoUp),
        shoulderToWaistDropMeters: shoulderFront.clone().sub(lowerLeft).dot(torsoUp),
        frontSurfaceWaypointCount: 4,
      };
      actor.quiverHarness.sampledPoints = collectPoints(harness.visual, 900);
    }

    function disposeQuiverHarness(actor) {
      if (!actor.quiverHarness) return;
      actor.quiverHarness = null;
    }

    function buildBowStringRig(actor) {
      actor.bowString = null;
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow) return;
      let rig = null;
      bow.visual.traverse((mesh) => {
        if (rig || !mesh.isMesh || !mesh.geometry?.attributes?.position || !mesh.geometry.index) return;
        mesh.geometry = mesh.geometry.clone();
        const position = mesh.geometry.attributes.position;
        mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox;
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y < 0.5 || size.x <= 0) return;
        const chordLimit = bounds.min.x + size.x * 0.05;
        const centerZ = (bounds.min.z + bounds.max.z) * 0.5;
        const thicknessLimit = size.z * 0.1;
        const lower = bounds.min.y + size.y * 0.04;
        const upper = bounds.max.y - size.y * 0.04;
        const stringVertex = (index) => position.getX(index) <= chordLimit
          && Math.abs(position.getZ(index) - centerZ) <= thicknessLimit;
        const staticStringVertex = (index) => position.getX(index) <= bounds.min.x + size.x * 0.08
          && Math.abs(position.getZ(index) - centerZ) <= size.z * 0.18;
        const sourceIndex = mesh.geometry.index;
        const kept = [];
        let removedTriangles = 0;
        for (let offset = 0; offset < sourceIndex.count; offset += 3) {
          const triangle = [sourceIndex.getX(offset), sourceIndex.getX(offset + 1), sourceIndex.getX(offset + 2)];
          const isStringTriangle = triangle.every((index) => staticStringVertex(index)
            && position.getY(index) >= lower
            && position.getY(index) <= upper);
          if (isStringTriangle) removedTriangles += 1;
          else kept.push(...triangle);
        }
        if (removedTriangles < 100) return;
        mesh.geometry.setIndex(kept);
        mesh.geometry.clearGroups();
        mesh.geometry.addGroup(0, kept.length, 0);
        mesh.geometry.computeBoundingSphere();

        const lowerAnchor = new THREE.Vector3();
        const upperAnchor = new THREE.Vector3();
        let lowerCount = 0;
        let upperCount = 0;
        for (let index = 0; index < position.count; index += 1) {
          const y = position.getY(index);
          if (!stringVertex(index)) continue;
          const vertex = new THREE.Vector3(position.getX(index), y, position.getZ(index));
          if (y >= bounds.min.y + size.y * 0.04 && y <= bounds.min.y + size.y * 0.12) {
            lowerAnchor.add(vertex);
            lowerCount += 1;
          }
          if (y >= bounds.min.y + size.y * 0.88 && y <= bounds.min.y + size.y * 0.96) {
            upperAnchor.add(vertex);
            upperCount += 1;
          }
        }
        if (!lowerCount || !upperCount) throw new Error("Bow string rig could not locate both limb-tip anchors.");
        lowerAnchor.multiplyScalar(1 / lowerCount);
        upperAnchor.multiplyScalar(1 / upperCount);
        const restNock = lowerAnchor.clone().lerp(upperAnchor, 0.5);
        const stringMaterial = new THREE.MeshStandardMaterial({ color: 0x7b5735, roughness: 0.9, metalness: 0 });
        const stringGeometry = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 8, 1, true);
        const lowerSegment = new THREE.Mesh(stringGeometry, stringMaterial);
        const upperSegment = new THREE.Mesh(stringGeometry.clone(), stringMaterial);
        lowerSegment.name = "dynamic-bow-string-lower";
        upperSegment.name = "dynamic-bow-string-upper";
        lowerSegment.frustumCulled = false;
        upperSegment.frustumCulled = false;
        mesh.add(lowerSegment, upperSegment);
        rig = {
          host: mesh,
          lowerAnchor,
          upperAnchor,
          restNock,
          lowerSegment,
          upperSegment,
          currentNockWorld: new THREE.Vector3(),
          removedTriangles,
        };
      });
      if (!rig) throw new Error("Bow string rig could not isolate the modeled straight string.");
      actor.bowString = { ...rig, pulled: false, pullAlpha: 0, nockErrorMeters: null };
    }

    function bowStringPullAlpha(state) {
      if (!state.handArrowVisible) return 0;
      const clipName = actor?.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      if (["ProLongbow__StandingAimOverdraw", "ProLongbow__StandingAimWalkForward", BOW_AIM_RUN_NAME].includes(clipName)) return 1;
      if (clipName === BOW_QUIVER_DRAW_NAME) {
        return THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.nocked - 0.12, BOW_DRAW_TIMING.nocked);
      }
      if (clipName === BOW_RELEASE_NAME) {
        return 1 - THREE.MathUtils.smoothstep(normalizedTime, BOW_RELEASE_TIMING.release, BOW_RELEASE_TIMING.release + 0.08);
      }
      if (clipName === BOW_TRIPLE_SHOT_NAME) {
        const nockedTime = BOW_TIMING.tripleArrowNocked;
        return THREE.MathUtils.smoothstep(normalizedTime, nockedTime - 0.1, nockedTime);
      }
      return 0;
    }

    function updateBowString(actor, state) {
      if (!actor.bowString) return;
      const pullAlpha = bowStringPullAlpha(state);
      const nockWorld = drawFingerNockWorld(actor);
      const target = nockWorld ? actor.bowString.host.worldToLocal(nockWorld.clone()) : actor.bowString.restNock;
      const currentNock = actor.bowString.restNock.clone().lerp(target, pullAlpha);
      const alignSegment = (segment, start, end) => {
        const direction = end.clone().sub(start);
        segment.position.copy(start).add(end).multiplyScalar(0.5);
        segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        segment.scale.set(1, direction.length(), 1);
        segment.updateMatrixWorld(true);
      };
      alignSegment(actor.bowString.lowerSegment, actor.bowString.lowerAnchor, currentNock);
      alignSegment(actor.bowString.upperSegment, currentNock, actor.bowString.upperAnchor);
      actor.bowString.currentNockWorld.copy(currentNock);
      actor.bowString.host.localToWorld(actor.bowString.currentNockWorld);
      actor.bowString.pulled = pullAlpha > 0.95;
      actor.bowString.pullAlpha = pullAlpha;
      actor.bowString.nockErrorMeters = nockWorld && pullAlpha > 0.95
        ? actor.bowString.currentNockWorld.distanceTo(nockWorld)
        : null;
    }

    function weaponHandContactMetrics(actor, record, side, centerY = 0) {
      if (!record) return null;
      actor.model.updateMatrixWorld(true);
      const hand = findBone(actor.bones, `${side}Hand`);
      const points = collectPoints(record.visual, 6000).filter((point) => (
        Math.abs(record.socket.worldToLocal(point.clone()).y - centerY) < 0.065
      ));
      const digits = Object.fromEntries(["Index", "Middle", "Ring", "Pinky", "Thumb"].map((name) => {
        const chain = [1, 2, 3, 4].map((index) => findBone(actor.bones, `${side}Hand${name}${index}`))
          .filter(Boolean).map((bone) => bone.getWorldPosition(new THREE.Vector3()));
        const candidates = chain.slice(1).map((end, index) => closestSampleToSurface(chain[index], end, points, 8));
        const closest = candidates.filter(Boolean).sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
        return [name, {
          distanceMeters: closest?.distanceMeters ?? null,
          contactsHandle: Boolean(closest && closest.distanceMeters <= 0.024),
          chainInHand: chain.map((point) => hand.worldToLocal(point.clone()).multiplyScalar(actor.model.scale.x).toArray()),
          chainInSocket: chain.map((point) => record.socket.worldToLocal(point.clone()).toArray()),
        }];
      }));
      const localPoints = points.map((point) => record.socket.worldToLocal(point.clone()));
      const bounds = new THREE.Box3().setFromPoints(localPoints);
      const coreBounds = new THREE.Box3().setFromPoints(localPoints.filter((point) => Math.abs(point.y - centerY) < 0.018));
      return {
        asset: record.asset, side, centerY, surfaceSamples: points.length,
        handleBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
        handleCoreBounds: { min: coreBounds.min.toArray(), max: coreBounds.max.toArray() },
        digits,
        fingerContactCount: ["Index", "Middle", "Ring", "Pinky"].filter((name) => digits[name].contactsHandle).length,
        thumbContactsHandle: digits.Thumb.contactsHandle,
      };
    }

    function pointToSegmentDistance(point, start, end) {
      const segment = end.clone().sub(start);
      const lengthSquared = segment.lengthSq();
      if (lengthSquared < 1e-8) return point.distanceTo(start);
      const phase = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
      return point.distanceTo(start.clone().addScaledVector(segment, phase));
    }

    function closestSampleToSurface(digitStart, digitEnd, surfacePoints, samples = 16) {
      let closest = null;
      for (let index = 0; index <= samples; index += 1) {
        const digitPoint = digitStart.clone().lerp(digitEnd, index / samples);
        for (const surfacePoint of surfacePoints) {
          const distanceMeters = digitPoint.distanceTo(surfacePoint);
          if (!closest || distanceMeters < closest.distanceMeters) {
            closest = { distanceMeters, digitPoint, surfacePoint };
          }
        }
      }
      return closest;
    }

    function bowHandleContactMetrics(actor, bow) {
      if (!bow) return null;
      actor.model.updateMatrixWorld(true);
      bow.socket.updateWorldMatrix(true, true);
      const handleStart = bow.socket.localToWorld(new THREE.Vector3(0, -0.075, 0));
      const handleEnd = bow.socket.localToWorld(new THREE.Vector3(0, 0.075, 0));
      const handleHalfLengthMeters = 0.09;
      const digitRadiusMeters = 0.012;
      const contactToleranceMeters = 0.012;
      const gripSurfacePoints = collectPoints(bow.visual, 6000).filter((point) => (
        Math.abs(bow.socket.worldToLocal(point.clone()).y) <= handleHalfLengthMeters
      ));
      const digitNames = ["Index", "Middle", "Ring", "Pinky", "Thumb"];
      const digits = Object.fromEntries(digitNames.map((name) => {
        const chain = [1, 2, 3]
          .map((index) => findBone(actor.bones, `LeftHand${name}${index}`)?.getWorldPosition(new THREE.Vector3()) ?? null)
          .filter(Boolean);
        const candidates = chain.length === 3
          ? [
            closestSampleToSurface(chain[0], chain[1], gripSurfacePoints),
            closestSampleToSurface(chain[1], chain[2], gripSurfacePoints),
          ]
          : [];
        const closest = candidates.reduce(
          (best, candidate) => (!best || candidate.distanceMeters < best.distanceMeters ? candidate : best),
          null,
        );
        const centerlineDistanceMeters = closest?.distanceMeters ?? null;
        return [name, {
          chainWorld: chain.map((point) => point.toArray()),
          closestDigitPointWorld: closest?.digitPoint.toArray() ?? null,
          closestHandlePointWorld: closest?.surfacePoint.toArray() ?? null,
          surfaceDistanceMeters: centerlineDistanceMeters,
          surfaceGapMeters: centerlineDistanceMeters === null
            ? null
            : Math.max(0, centerlineDistanceMeters - digitRadiusMeters),
          contactsHandle: centerlineDistanceMeters !== null
            && centerlineDistanceMeters <= digitRadiusMeters + contactToleranceMeters,
        }];
      }));
      const fingerContactCount = ["Index", "Middle", "Ring", "Pinky"]
        .filter((name) => digits[name].contactsHandle).length;
      return {
        handleStartWorld: handleStart.toArray(),
        handleEndWorld: handleEnd.toArray(),
        handleHalfLengthMeters,
        gripSurfacePointCount: gripSurfacePoints.length,
        digitRadiusMeters,
        contactToleranceMeters,
        digits,
        fingerContactCount,
        thumbContactsHandle: digits.Thumb.contactsHandle,
        passes: fingerContactCount >= 3
          && digits.Thumb.contactsHandle,
      };
    }

    const BODY_CLEARANCE_CAPSULES = [
      { name: "lower-torso", start: "Hips", end: "Spine1", radius: 0.145 },
      { name: "upper-torso", start: "Spine1", end: "Neck", radius: 0.155 },
      { name: "shoulders", start: "LeftShoulder", end: "RightShoulder", radius: 0.09 },
      { name: "head", start: "Head", end: "Head", radius: 0.11 },
      { name: "left-upper-arm", start: "LeftArm", end: "LeftForeArm", radius: 0.075 },
      { name: "left-forearm", start: "LeftForeArm", end: "LeftHand", radius: 0.06 },
      { name: "right-upper-arm", start: "RightArm", end: "RightForeArm", radius: 0.075 },
      { name: "right-forearm", start: "RightForeArm", end: "RightHand", radius: 0.06 },
      { name: "left-thigh", start: "LeftUpLeg", end: "LeftLeg", radius: 0.1 },
      { name: "left-shin", start: "LeftLeg", end: "LeftFoot", radius: 0.075 },
      { name: "right-thigh", start: "RightUpLeg", end: "RightLeg", radius: 0.1 },
      { name: "right-shin", start: "RightLeg", end: "RightFoot", radius: 0.075 },
    ];

    const ARTIFACT_CLEARANCE_POLICIES = {
      back: {
        fitMode: "rigid-mounted",
        // Keep a visible 2 mm buffer without forcing the close-fitting quiver to
        // float away from the torso during the most extreme arm swing.
        minimumMeters: 0.002,
        correctMounted: true,
        excludedCapsules: [],
        correctionExcludedCapsules: [
          "left-upper-arm", "left-forearm", "right-upper-arm", "right-forearm",
          "left-thigh", "left-shin", "right-thigh", "right-shin",
        ],
      },
      harness: {
        fitMode: "skinned-shell",
        minimumMeters: 0,
        correctMounted: false,
        excludedCapsules: [],
        correctionExcludedCapsules: [
          "left-upper-arm", "left-forearm", "right-upper-arm", "right-forearm",
          "left-thigh", "left-shin", "right-thigh", "right-shin",
        ],
      },
      primary: {
        fitMode: "held-socket",
        minimumMeters: 0,
        correctMounted: false,
        // A held artifact is allowed to contact its gripping arm. It is never
        // allowed to pass through the rest of the body.
        excludedCapsules: ["left-upper-arm", "left-forearm"],
      },
      ammo: {
        fitMode: "held-socket",
        minimumMeters: 0,
        correctMounted: false,
        excludedCapsules: ["right-upper-arm", "right-forearm"],
      },
      clothing: {
        fitMode: "skinned-shell",
        minimumMeters: 0.003,
        correctMounted: false,
        excludedCapsules: [],
      },
      cloth: {
        fitMode: "dynamic-cloth",
        minimumMeters: 0.006,
        correctMounted: false,
        excludedCapsules: [],
      },
    };

    function worldBodyClearanceCapsules(actor, excludedCapsules = []) {
      const excluded = new Set(excludedCapsules);
      return BODY_CLEARANCE_CAPSULES.filter(({ name }) => !excluded.has(name)).map((definition) => {
        const startBone = findBone(actor.bones, definition.start);
        const endBone = findBone(actor.bones, definition.end);
        if (!startBone || !endBone) return null;
        return {
          ...definition,
          startWorld: startBone.getWorldPosition(new THREE.Vector3()),
          endWorld: endBone.getWorldPosition(new THREE.Vector3()),
        };
      }).filter(Boolean);
    }

    function attachmentBodyClearanceMetrics(actor, record, excludedCapsulesOverride = null) {
      const policy = ARTIFACT_CLEARANCE_POLICIES[record?.role];
      if (!record?.visual?.visible || !policy) return null;
      actor.model.updateMatrixWorld(true);
      record.socket.updateWorldMatrix(true, true);
      const points = collectPoints(
        record.visual,
        700,
        (mesh) => !mesh.name.startsWith("dynamic-bow-string-"),
      );
      const capsules = worldBodyClearanceCapsules(actor, excludedCapsulesOverride ?? policy.excludedCapsules);
      const anchorBone = findBone(actor.bones, record.activeBone ?? record.bone);
      const socketWorld = record.socket.getWorldPosition(new THREE.Vector3());
      const anchorWorld = anchorBone?.getWorldPosition(new THREE.Vector3()) ?? null;
      let minimum = {
        clearanceMeters: Infinity,
        capsuleName: null,
        pointWorld: null,
        capsuleStartWorld: null,
        capsuleEndWorld: null,
      };
      for (const point of points) {
        for (const capsule of capsules) {
          const clearanceMeters = pointToSegmentDistance(point, capsule.startWorld, capsule.endWorld) - capsule.radius;
          if (clearanceMeters < minimum.clearanceMeters) {
            minimum = {
              clearanceMeters,
              capsuleName: capsule.name,
              pointWorld: point.toArray(),
              capsuleStartWorld: capsule.startWorld.toArray(),
              capsuleEndWorld: capsule.endWorld.toArray(),
            };
          }
        }
      }
      if (!Number.isFinite(minimum.clearanceMeters)) return null;
      return {
        ...minimum,
        asset: record.asset,
        role: record.role,
        fitMode: policy.fitMode,
        anchorBone: anchorBone?.name ?? null,
        anchoredToExpectedBone: Boolean(anchorBone && record.socket.parent === anchorBone),
        anchorOffsetMeters: anchorWorld ? socketWorld.distanceTo(anchorWorld) : null,
        minimumRequiredMeters: policy.minimumMeters,
        passes: minimum.clearanceMeters >= policy.minimumMeters,
      };
    }

    function translateSocketInWorld(socket, worldDelta) {
      const parent = socket.parent;
      if (!parent) return;
      const currentWorld = socket.getWorldPosition(new THREE.Vector3());
      const targetLocal = parent.worldToLocal(currentWorld.add(worldDelta));
      socket.position.copy(targetLocal);
      socket.updateMatrixWorld(true);
    }

    function enforceMountedArtifactClearance(actor) {
      const corrections = [];
      for (const record of actor.sockets) {
        const policy = ARTIFACT_CLEARANCE_POLICIES[record.role];
        if (!policy?.correctMounted || !record.visual.visible) continue;
        let totalCorrectionMeters = 0;
        for (let iteration = 0; iteration < 4; iteration += 1) {
          const metric = attachmentBodyClearanceMetrics(actor, record, policy.correctionExcludedCapsules);
          if (!metric || metric.passes) break;
          const spine = findBone(actor.bones, "Spine2") ?? findBone(actor.bones, "Spine1");
          const spineWorld = spine?.getWorldPosition(new THREE.Vector3());
          // Bounds must use this actor's axes. A world-axis box center changes when
          // the entire actor turns, which otherwise changes its mounted clearance.
          const inverseRoot = scene.matrixWorld.clone().invert();
          const bounds = new THREE.Box3().setFromPoints(collectPoints(record.visual, Infinity)
            .map((point) => point.applyMatrix4(inverseRoot)));
          const centerWorld = bounds.getCenter(new THREE.Vector3()).applyMatrix4(scene.matrixWorld);
          const outward = spineWorld ? centerWorld.sub(spineWorld) : bodyDirection(new THREE.Vector3(0, 0, -1));
          if (outward.lengthSq() < 1e-8) outward.copy(bodyDirection(new THREE.Vector3(0, 0, -1)));
          outward.normalize();
          const remainingCorrectionBudget = Math.max(0, 0.035 - totalCorrectionMeters);
          const correctionMeters = Math.min(
            policy.minimumMeters - metric.clearanceMeters + 0.002,
            0.012,
            remainingCorrectionBudget,
          );
          if (correctionMeters <= 0) break;
          const worldDelta = outward.multiplyScalar(correctionMeters);
          translateSocketInWorld(record.socket, worldDelta);
          if (record.role === "back" && actor.arrowBundle) translateSocketInWorld(actor.arrowBundle.socket, worldDelta);
          totalCorrectionMeters += correctionMeters;
        }
        const finalMetric = attachmentBodyClearanceMetrics(actor, record);
        corrections.push({
          asset: record.asset,
          role: record.role,
          correctionMeters: totalCorrectionMeters,
          finalClearanceMeters: finalMetric?.clearanceMeters ?? null,
          passes: finalMetric?.passes ?? true,
        });
      }
      return corrections;
    }

    function artifactBodyClearanceMetrics(actor) {
      return actor.sockets.map((record) => attachmentBodyClearanceMetrics(actor, record)).filter(Boolean);
    }

    function minimumQuiverBodyClearance(actor) {
      if (!actor.arrowBundle) return null;
      const bodyProxies = [
        ["Head", 0.105],
        ["Neck", 0.075],
        ["LeftShoulder", 0.105],
        ["RightShoulder", 0.105],
      ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
      let clearance = Infinity;
      const visibleCount = Math.min(actor.arrowBundle.displayedInQuiver ?? 0, actor.arrowBundle.placements.length);
      for (const placement of actor.arrowBundle.placements.slice(0, visibleCount)) {
        const start = actor.arrowBundle.socket.localToWorld(new THREE.Vector3(
          placement.x,
          placement.y + actor.arrowBundle.arrowBounds.min.y,
          placement.z,
        ));
        const end = actor.arrowBundle.socket.localToWorld(new THREE.Vector3(
          placement.x,
          placement.y + actor.arrowBundle.arrowBounds.max.y,
          placement.z,
        ));
        for (const { bone, radius } of bodyProxies) {
          const boneWorld = bone.getWorldPosition(new THREE.Vector3());
          clearance = Math.min(clearance, pointToSegmentDistance(boneWorld, start, end) - radius);
        }
      }
      return Number.isFinite(clearance) ? clearance : null;
    }

    function harnessBodyClearanceMetrics(actor) {
      const points = actor.quiverHarness?.sampledPoints ?? [];
      if (!points.length) return null;
      const bodyProxies = [
        ["Spine1", 0.09],
        ["Spine2", 0.095],
        ["Neck", 0.06],
        ["LeftShoulder", 0.065],
        ["RightShoulder", 0.065],
      ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
      let minimum = { clearance: Infinity, pointIndex: -1, boneName: null, pointWorld: null, boneWorld: null };
      points.forEach((point, pointIndex) => {
        bodyProxies.forEach(({ bone, radius }) => {
          const boneWorld = bone.getWorldPosition(new THREE.Vector3());
          const clearance = point.distanceTo(boneWorld) - radius;
          if (clearance < minimum.clearance) {
            minimum = {
              clearance,
              pointIndex,
              boneName: bone.name,
              pointWorld: point.toArray(),
              boneWorld: boneWorld.toArray(),
            };
          }
        });
      });
      return Number.isFinite(minimum.clearance) ? minimum : null;
    }

    function minimumHarnessBodyClearance(actor) {
      return harnessBodyClearanceMetrics(actor)?.clearance ?? null;
    }

    function minimumGreatswordBodyClearance(actor, hiltWorld, bladeTipWorld) {
      const bodyProxies = [
        ["Spine1", 0.15],
        ["Spine2", 0.15],
        ["Neck", 0.075],
        ["Head", 0.105],
        ["LeftShoulder", 0.1],
        ["RightShoulder", 0.1],
      ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
      return Math.min(...bodyProxies.map(({ bone, radius }) => (
        pointToSegmentDistance(bone.getWorldPosition(new THREE.Vector3()), hiltWorld, bladeTipWorld) - radius
      )));
    }

    function minimumHandArrowBodyClearance(actor, handArrow) {
      if (!handArrow?.visual.visible) return null;
      if (handArrowCollisionMode(actor) === "nested-in-clear-quiver") {
        const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
        const policy = ARTIFACT_CLEARANCE_POLICIES.back;
        return quiver
          ? attachmentBodyClearanceMetrics(actor, quiver, policy.correctionExcludedCapsules)?.clearanceMeters ?? null
          : null;
      }
      const bodyProxies = [
        ["Spine", 0.14],
        ["Spine1", 0.15],
        ["Spine2", 0.14],
        ["Neck", 0.075],
        ["Head", 0.105],
        ["RightShoulder", 0.105],
      ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
      const tip = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0));
      const nock = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0));
      return Math.min(...bodyProxies.map(({ bone, radius }) => (
        pointToSegmentDistance(bone.getWorldPosition(new THREE.Vector3()), tip, nock) - radius
      )));
    }

    function handArrowCollisionMode(actor) {
      const clipName = actor?.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      if (clipName === BOW_QUIVER_DRAW_NAME
        && normalizedTime >= BOW_DRAW_TIMING.featherGrip
        && normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
        // While the shaft is still inside the rigid quiver, inherit the verified
        // quiver/body clearance instead of treating the contained arrow as an
        // independent body collider.
        return "nested-in-clear-quiver";
      }
      return "independent-body-clearance";
    }

    function minimumHandArrowWristClearance(actor, handArrow) {
      if (!handArrow?.visual.visible) return null;
      const wrist = findBone(actor.bones, "RightHand");
      if (!wrist) return null;
      const tip = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0));
      const nock = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0));
      return pointToSegmentDistance(wrist.getWorldPosition(new THREE.Vector3()), tip, nock) - 0.035;
    }

    function buildHandArrowExtras(actor) {
      actor.handArrowExtras = [];
      const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && /arrow/i.test(asset));
      if (!handArrow) return;
      for (const [index, offset] of [-0.018, 0.018].entries()) {
        const visual = handArrow.prepared.visual.clone(true);
        visual.name = `bow-hand-arrow-extra-${index + 2}`;
        visual.position.x += offset;
        visual.position.z += index === 0 ? 0.008 : -0.008;
        visual.visible = false;
        handArrow.socket.add(visual);
        actor.handArrowExtras.push(visual);
      }
    }

    function disposeHandArrowExtras(actor) {
      for (const visual of actor.handArrowExtras) visual.removeFromParent();
      actor.handArrowExtras = [];
    }

    function buildArrowProjectile(actor, preparedAssets) {
      actor.projectile = null;
      if (!preparedAssets.has("arrow")) return;
      const visuals = Array.from({ length: 3 }, (_, index) => {
        const visual = preparedAssets.get("arrow").visual.clone(true);
        visual.name = `bow-arrow-projectile-${index + 1}`;
        visual.visible = false;
        scene.add(visual);
        return visual;
      });
      actor.projectile = {
        visuals,
        startPosition: new THREE.Vector3(),
        startQuaternion: new THREE.Quaternion(),
        direction: new THREE.Vector3(),
        captured: false,
        distanceMeters: 0,
      };
    }

    function disposeArrowProjectile(actor) {
      if (!actor.projectile) return;
      for (const visual of actor.projectile.visuals) visual.removeFromParent();
      actor.projectile = null;
    }

    const BOW_TIMING = {
      tripleArrowPickup: 0.28,
      tripleArrowNocked: 0.56,
      tripleRelease: 0.58,
    };

    const BOW_DRAW_TIMING = {
      reachStart: 0.03,
      featherGrip: 0.18,
      withdrawBack: 0.34,
      lowerWaist: 0.56,
      forwardWaist: 0.72,
      presentToBow: 0.82,
      nocked: 0.92,
    };

    const BOW_RELEASE_TIMING = { release: 0.3 };
    const BOW_STRIKE_TIMING = { windupEnd: 0.28, contact: 0.52, recoverStart: 0.66 };

    function applyAttachmentPose(record, poseName) {
      const pose = record?.poses?.[poseName];
      if (!pose) return;
      const bone = findBone(actor.bones, pose.bone);
      if (!bone) throw new Error(`Missing ${pose.bone} for ${record.asset} ${poseName} pose.`);
      if (record.socket.parent !== bone) bone.add(record.socket);
      const actorScale = actor.model.scale.x;
      record.socket.scale.setScalar(1 / actorScale);
      record.socket.position.fromArray(pose.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale);
      record.socket.rotation.fromArray(pose.rotation ?? [0, 0, 0]);
      record.activeBone = pose.bone;
      record.activePose = poseName;
      record.socket.updateMatrixWorld(true);
    }

    function attachmentPoseWorld(record, poseName) {
      const pose = record?.poses?.[poseName];
      const bone = pose ? findBone(actor.bones, pose.bone) : null;
      if (!pose || !bone) return null;
      bone.updateWorldMatrix(true, false);
      const actorScale = actor.model.scale.x;
      const localMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3().fromArray(pose.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale),
        new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(pose.rotation ?? [0, 0, 0])),
        new THREE.Vector3().setScalar(1 / actorScale),
      );
      const worldMatrix = bone.matrixWorld.clone().multiply(localMatrix);
      return {
        position: new THREE.Vector3().setFromMatrixPosition(worldMatrix),
        quaternion: new THREE.Quaternion().setFromRotationMatrix(worldMatrix),
        scale: new THREE.Vector3().setFromMatrixScale(worldMatrix),
      };
    }

    function applyBlendedAttachmentPose(record, fromPoseName, toPoseName, alpha) {
      const from = attachmentPoseWorld(record, fromPoseName);
      const to = attachmentPoseWorld(record, toPoseName);
      if (!from || !to) return;
      if (record.socket.parent !== scene) scene.add(record.socket);
      record.socket.position.copy(from.position).lerp(to.position, alpha);
      record.socket.quaternion.copy(from.quaternion).slerp(to.quaternion, alpha);
      record.socket.scale.copy(from.scale).lerp(to.scale, alpha);
      record.activeBone = "world-transfer";
      record.activePose = `${fromPoseName}-to-${toPoseName}`;
      localizeWorldTransform(record.socket);
      record.socket.updateMatrixWorld(true);
    }

    const GREATSWORD_SHEATHE_TIMING = {
      shoulderPrep: 0.2,
      lifted: 0.45,
      bladeOut: 0.62,
      bladeTurned: 0.74,
      inserted: 1,
    };

    function bodyDirection(localDirection) {
      const quaternion = actor.model.getWorldQuaternion(new THREE.Quaternion());
      return localDirection.clone().applyQuaternion(quaternion).normalize();
    }

    function greatswordBladeQuaternion(bladeDirection, preferredCrossguardDirection) {
      const blade = bladeDirection.clone().normalize();
      const crossguard = preferredCrossguardDirection.clone()
        .addScaledVector(blade, -preferredCrossguardDirection.dot(blade));
      if (crossguard.lengthSq() < 1e-6) {
        crossguard.copy(bodyDirection(new THREE.Vector3(0, 0, 1)))
          .addScaledVector(blade, -bodyDirection(new THREE.Vector3(0, 0, 1)).dot(blade));
      }
      crossguard.normalize();
      const normal = new THREE.Vector3().crossVectors(crossguard, blade).normalize();
      return new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(crossguard, blade, normal),
      );
    }

    function restoreGreatswordHandAttachment() {
      const record = actor?.primary;
      if (!record || record.asset !== "longsword") return;
      if (record.socket.parent === scene) {
        const hand = findBone(actor.bones, record.bone);
        if (hand) hand.add(record.socket);
        record.socket.scale.setScalar(1 / actor.model.scale.x);
        updateSocketFromControls();
      }
      record.activeBone = record.bone;
      record.activePose = "fixed";
      actor.greatswordSheathe = null;
    }

    function updateGreatswordSheathePreview() {
      if ((settings.mode === "catalog") || settings.loadoutId !== "longswordTwoHand" || !actor?.primary) return;
      const clipName = actor.action?.getClip().name ?? "";
      if (clipName !== GREATSWORD_TWO_HAND_SHEATHE_NAME) {
        restoreGreatswordHandAttachment();
        return;
      }

      const record = actor.primary;
      const socket = record.socket;
      actor.model.updateMatrixWorld(true);
      if (!actor.greatswordSheathe) {
        const rightHand = findBone(actor.bones, "RightHand");
        const leftHand = findBone(actor.bones, "LeftHand");
        if (!rightHand || !leftHand) return;
        socket.updateMatrixWorld(true);
        const startPosition = socket.getWorldPosition(new THREE.Vector3());
        const startQuaternion = socket.getWorldQuaternion(new THREE.Quaternion());
        const startScale = socket.getWorldScale(new THREE.Vector3());
        const inverseSocketQuaternion = startQuaternion.clone().invert();
        const rightHandWorldQuaternion = rightHand.getWorldQuaternion(new THREE.Quaternion());
        const leftHandWorldQuaternion = leftHand.getWorldQuaternion(new THREE.Quaternion());
        actor.greatswordSheathe = {
          startPosition,
          startQuaternion,
          startScale,
          rightGripLocal: socket.worldToLocal(rightHand.getWorldPosition(new THREE.Vector3())),
          handRelative: {
            Right: inverseSocketQuaternion.clone().multiply(rightHandWorldQuaternion),
            Left: inverseSocketQuaternion.clone().multiply(leftHandWorldQuaternion),
          },
        };
        scene.attach(socket);
      }

      const state = actor.greatswordSheathe;
      const normalizedTime = THREE.MathUtils.clamp(settings.normalizedTime, 0, 1);
      const shoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3());
      const spine = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3());
      if (!shoulder || !spine) return;
      const up = bodyDirection(new THREE.Vector3(0, 1, 0));
      const right = shoulder.clone().sub(spine).addScaledVector(up, -shoulder.clone().sub(spine).dot(up)).normalize();
      const back = bodyDirection(new THREE.Vector3(0, 0, -1));
      const forward = back.clone().negate();
      const prepPosition = shoulder.clone().addScaledVector(right, 0.24).addScaledVector(up, 0.08).addScaledVector(forward, 0.13);
      const liftPosition = shoulder.clone().addScaledVector(right, 0.25).addScaledVector(up, 0.28).addScaledVector(back, 0.06);
      const turnPosition = shoulder.clone().addScaledVector(right, 0.27).addScaledVector(up, 0.3).addScaledVector(back, 0.34);
      const turnedPosition = shoulder.clone().addScaledVector(right, 0.18).addScaledVector(up, 0.2).addScaledVector(back, 0.3);
      const insertedPosition = shoulder.clone().addScaledVector(right, 0.2).addScaledVector(up, -0.02).addScaledVector(back, 0.33);
      const liftQuaternion = greatswordBladeQuaternion(
        up.clone().multiplyScalar(0.9).addScaledVector(back, 0.3).addScaledVector(right, 0.12),
        right,
      );
      const turnQuaternion = greatswordBladeQuaternion(
        up.clone().multiplyScalar(0.42).addScaledVector(back, 0.88).addScaledVector(right, 0.14),
        right,
      );
      const insertedQuaternion = greatswordBladeQuaternion(
        up.clone().multiplyScalar(-0.98).addScaledVector(back, 0.2),
        right,
      );
      const keys = [
        { time: 0, position: state.startPosition, quaternion: state.startQuaternion },
        { time: GREATSWORD_SHEATHE_TIMING.shoulderPrep, position: prepPosition, quaternion: liftQuaternion },
        { time: GREATSWORD_SHEATHE_TIMING.lifted, position: liftPosition, quaternion: liftQuaternion },
        { time: GREATSWORD_SHEATHE_TIMING.bladeOut, position: turnPosition, quaternion: turnQuaternion },
        { time: GREATSWORD_SHEATHE_TIMING.bladeTurned, position: turnedPosition, quaternion: insertedQuaternion },
        { time: GREATSWORD_SHEATHE_TIMING.inserted, position: insertedPosition, quaternion: insertedQuaternion },
      ];
      let from = keys[0];
      let to = keys[1];
      for (let index = 1; index < keys.length; index += 1) {
        if (normalizedTime <= keys[index].time) {
          from = keys[index - 1];
          to = keys[index];
          break;
        }
      }
      const rawAlpha = THREE.MathUtils.inverseLerp(from.time, to.time, normalizedTime);
      const alpha = THREE.MathUtils.smoothstep(rawAlpha, 0, 1);
      socket.position.copy(from.position).lerp(to.position, alpha);
      socket.quaternion.copy(from.quaternion).slerp(to.quaternion, alpha);
      socket.scale.copy(state.startScale);
      localizeWorldTransform(socket);
      socket.updateMatrixWorld(true);
      record.activeBone = "world-transfer";
      record.activePose = "two-hand-shoulder-sheathe";
    }

    function updateBowCarryPreview() {
      if ((settings.mode === "catalog") || settings.loadoutId !== "bow") return;
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow?.poses) return;
      const clipName = actor.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      if (clipName.endsWith("BowEquipFromBack")) {
        if (normalizedTime <= 0.24) applyAttachmentPose(bow, "back");
        else if (normalizedTime >= 0.4) applyAttachmentPose(bow, "hand");
        else applyBlendedAttachmentPose(bow, "back", "hand", THREE.MathUtils.smoothstep(normalizedTime, 0.24, 0.4));
        return;
      }
      if (clipName.endsWith("BowStowToBack")) {
        if (normalizedTime <= 0.32) applyAttachmentPose(bow, "hand");
        else if (normalizedTime >= 0.48) applyAttachmentPose(bow, "back");
        else applyBlendedAttachmentPose(bow, "hand", "back", THREE.MathUtils.smoothstep(normalizedTime, 0.32, 0.48));
        return;
      }
      applyAttachmentPose(bow, "hand");
    }

    function bowArrowState() {
      const inventory = THREE.MathUtils.clamp(Math.round(settings.arrowCount), 0, 100);
      const clipName = actor?.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      let handArrowVisible = false;
      let firedThisPreview = false;
      let handArrowCount = 0;
      let firedArrowCount = 0;
      if (clipName === BOW_TRIPLE_SHOT_NAME) {
        const available = Math.min(3, inventory);
        handArrowCount = normalizedTime >= BOW_TIMING.tripleArrowPickup && normalizedTime < BOW_TIMING.tripleRelease ? available : 0;
        firedArrowCount = normalizedTime >= BOW_TIMING.tripleRelease ? available : 0;
        handArrowVisible = handArrowCount > 0;
        firedThisPreview = firedArrowCount > 0;
      } else if (clipName === BOW_QUIVER_DRAW_NAME) {
        handArrowVisible = normalizedTime >= BOW_DRAW_TIMING.featherGrip && inventory > 0;
        handArrowCount = handArrowVisible ? 1 : 0;
      } else if (clipName === BOW_RELEASE_NAME) {
        handArrowVisible = normalizedTime < BOW_RELEASE_TIMING.release && inventory > 0;
        firedThisPreview = normalizedTime >= BOW_RELEASE_TIMING.release && inventory > 0;
        handArrowCount = handArrowVisible ? 1 : 0;
        firedArrowCount = firedThisPreview ? 1 : 0;
      } else if (["ProLongbow__StandingAimOverdraw", "ProLongbow__StandingAimWalkForward", BOW_AIM_RUN_NAME].includes(clipName)) {
        handArrowVisible = inventory > 0;
        handArrowCount = handArrowVisible ? 1 : 0;
      }
      const displayedInQuiver = Math.max(0, inventory - handArrowCount - firedArrowCount);
      return { inventory, displayedInQuiver, handArrowVisible, handArrowCount, firedThisPreview, firedArrowCount };
    }

    const ARROW_FLIGHT_AXIS = new THREE.Vector3(0, 1, 0);

    function arrowWorldQuaternion(direction) {
      // Keep the original solo roll in actor space when this instance is positioned
      // or turned by the shared scene; a world-identity roll is not instance-relative.
      const rootRotation = scene.getWorldQuaternion(new THREE.Quaternion());
      const localDirection = direction.clone().applyQuaternion(rootRotation.clone().invert());
      return rootRotation.multiply(new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, localDirection));
    }

    function drawFingerNockWorld(actor) {
      const hand = findBone(actor.bones, "RightHand");
      if (!hand) return null;
      actor.model.updateMatrixWorld(true);
      const handWorld = hand.getWorldPosition(new THREE.Vector3());
      const thumb = findBone(actor.bones, "RightHandThumb3")
        ?? findBone(actor.bones, "RightHandThumb2")
        ?? findBone(actor.bones, "RightHandThumb1");
      const index = findBone(actor.bones, "RightHandIndex3")
        ?? findBone(actor.bones, "RightHandIndex2")
        ?? findBone(actor.bones, "RightHandIndex1");
      if (!thumb || !index) return handWorld;
      // The nock/fletching is pinched between the thumb and index finger. The old
      // index/middle average put the shaft beside the hand even when the numeric
      // reach error was zero.
      const nock = thumb.getWorldPosition(new THREE.Vector3())
        .add(index.getWorldPosition(new THREE.Vector3()))
        .multiplyScalar(0.5);
      const outward = nock.clone().sub(handWorld);
      const isMultishot = actor.action?.getClip().name === BOW_TRIPLE_SHOT_NAME;
      const fingerClearance = isMultishot ? 0.012 : 0.004;
      if (outward.lengthSq() > 1e-8) nock.addScaledVector(outward.normalize(), fingerClearance);
      return nock;
    }

    function slerpDirection(from, to, alpha) {
      const fromRotation = new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, from.clone().normalize());
      const toRotation = new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, to.clone().normalize());
      fromRotation.slerp(toRotation, THREE.MathUtils.clamp(alpha, 0, 1));
      return ARROW_FLIGHT_AXIS.clone().applyQuaternion(fromRotation).normalize();
    }

    function bowArrowTransferPose(actor, pickup, fingerNock, normalizedTime, quiverDirection, bowGrip) {
      const spine = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3()) ?? pickup.clone();
      const shoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3()) ?? pickup.clone();
      const head = findBone(actor.bones, "Head")?.getWorldPosition(new THREE.Vector3()) ?? shoulder.clone();
      const up = new THREE.Vector3(0, 1, 0);
      const outward = shoulder.clone().sub(spine);
      outward.y = 0;
      if (outward.lengthSq() < 1e-8) {
        outward.set(1, 0, 0).applyQuaternion(actor.model.getWorldQuaternion(new THREE.Quaternion()));
      }
      outward.normalize();
      // The bow hand is the reliable forward reference. Using the final draw hand
      // here sent the arrow behind the shoulder before nocking and caused the
      // shaft-through-body path visible in the rejected review frames.
      const front = bowGrip.clone().sub(spine);
      front.y = 0;
      if (front.lengthSq() < 1e-8) {
        front.copy(fingerNock).sub(spine);
        front.y = 0;
      }
      front.normalize();
      // The filmed back-quiver retrieval is not an overhead flourish. The elbow
      // drives backward, the hand withdraws the arrow beside the head, then drops
      // it to the waist and presents it forward from there for nocking.
      const withdrawBack = head.clone()
        .addScaledVector(up, -0.06)
        .addScaledVector(outward, 0.16)
        .addScaledVector(front, -0.08);
      const lowerWaist = spine.clone()
        .addScaledVector(up, -0.32)
        .addScaledVector(outward, 0.25)
        .addScaledVector(front, 0.13);
      const forwardWaist = spine.clone()
        .addScaledVector(up, -0.27)
        .addScaledVector(outward, 0.28)
        .addScaledVector(front, 0.43);
      const presentToBow = shoulder.clone()
        .addScaledVector(up, -0.10)
        .addScaledVector(outward, 0.30)
        .addScaledVector(front, 0.56);
      let nock;
      let stage;
      if (normalizedTime <= BOW_DRAW_TIMING.featherGrip) {
        nock = pickup.clone();
        stage = "feather-grip";
      } else if (normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
        const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.featherGrip, BOW_DRAW_TIMING.withdrawBack);
        nock = pickup.clone().lerp(withdrawBack, alpha);
        stage = "withdraw-back";
      } else if (normalizedTime <= BOW_DRAW_TIMING.lowerWaist) {
        const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.withdrawBack, BOW_DRAW_TIMING.lowerWaist);
        nock = withdrawBack.clone().lerp(lowerWaist, alpha);
        stage = "lower-waist";
      } else if (normalizedTime <= BOW_DRAW_TIMING.forwardWaist) {
        const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.lowerWaist, BOW_DRAW_TIMING.forwardWaist);
        nock = lowerWaist.clone().lerp(forwardWaist, alpha);
        stage = "forward-waist";
      } else if (normalizedTime <= BOW_DRAW_TIMING.presentToBow) {
        const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.forwardWaist, BOW_DRAW_TIMING.presentToBow);
        nock = forwardWaist.clone().lerp(presentToBow, alpha);
        stage = "present-to-bow";
      } else {
        const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.presentToBow, BOW_DRAW_TIMING.nocked);
        nock = presentToBow.clone().lerp(fingerNock, alpha);
        stage = normalizedTime < BOW_DRAW_TIMING.nocked ? "nock" : "full-draw";
      }
      const nockedDirection = bowGrip.clone().sub(nock).normalize();
      const featherLedDirection = quiverDirection.clone().negate();
      const waistDirection = front.clone().addScaledVector(up, 0.08).normalize();
      let direction;
      if (normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
        direction = featherLedDirection.clone();
      } else if (normalizedTime <= BOW_DRAW_TIMING.lowerWaist) {
        const orientationAlpha = THREE.MathUtils.smoothstep(
          normalizedTime,
          BOW_DRAW_TIMING.withdrawBack,
          BOW_DRAW_TIMING.lowerWaist,
        );
        direction = slerpDirection(featherLedDirection, waistDirection, orientationAlpha);
      } else if (normalizedTime <= BOW_DRAW_TIMING.presentToBow) {
        direction = waistDirection.clone();
      } else {
        const orientationAlpha = THREE.MathUtils.smoothstep(
          normalizedTime,
          BOW_DRAW_TIMING.presentToBow,
          BOW_DRAW_TIMING.nocked,
        );
        direction = slerpDirection(waistDirection, nockedDirection, orientationAlpha);
      }
      return { nock, direction, stage };
    }

    function alignHandArrow(handArrow) {
      if (!handArrow) return;
      const leftHand = findBone(actor.bones, "LeftHand");
      const rightHand = findBone(actor.bones, "RightHand");
      if (!leftHand || !rightHand) return;
      actor.model.updateMatrixWorld(true);
      const fingerNock = drawFingerNockWorld(actor) ?? rightHand.getWorldPosition(new THREE.Vector3());
      const clipName = actor.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      const isSingleDrawTransition = clipName === BOW_QUIVER_DRAW_NAME && normalizedTime < BOW_DRAW_TIMING.nocked;
      const isTripleDrawTransition = clipName === BOW_TRIPLE_SHOT_NAME && normalizedTime < BOW_TIMING.tripleArrowNocked;
      let transferDirection = null;
      if (isSingleDrawTransition || isTripleDrawTransition) {
        if (actor.arrowBundle?.pickupLocal) {
          const quiverDirection = ARROW_FLIGHT_AXIS.clone().applyQuaternion(
            actor.arrowBundle.socket.getWorldQuaternion(new THREE.Quaternion()),
          ).normalize();
          const transferTime = isTripleDrawTransition
            ? THREE.MathUtils.lerp(
              BOW_DRAW_TIMING.featherGrip,
              BOW_DRAW_TIMING.nocked,
              THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
            )
            : normalizedTime;
          const pickup = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone());
          const bowGrip = leftHand.getWorldPosition(new THREE.Vector3());
          const transfer = bowArrowTransferPose(actor, pickup, fingerNock, transferTime, quiverDirection, bowGrip);
          transferDirection = transfer.direction;
        }
      }
      const bow = leftHand.getWorldPosition(new THREE.Vector3());
      const direction = transferDirection ?? bow.sub(fingerNock).normalize();
      if (direction.lengthSq() < 1e-8) return;
      const desiredWorld = arrowWorldQuaternion(direction);
      const parentWorld = handArrow.socket.parent.getWorldQuaternion(new THREE.Quaternion());
      handArrow.socket.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
      let featherGripInset = 0;
      if (isSingleDrawTransition || isTripleDrawTransition) {
        const transferTime = isTripleDrawTransition
          ? THREE.MathUtils.lerp(
            BOW_DRAW_TIMING.featherGrip,
            BOW_DRAW_TIMING.nocked,
            THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
          )
          : normalizedTime;
        featherGripInset = transferTime <= BOW_DRAW_TIMING.presentToBow
          ? 0.075
          : THREE.MathUtils.lerp(
            0.075,
            0,
            THREE.MathUtils.smoothstep(transferTime, BOW_DRAW_TIMING.presentToBow, BOW_DRAW_TIMING.nocked),
          );
      }
      const nock = fingerNock.clone().addScaledVector(direction, -featherGripInset);
      const nockOffset = new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0).applyQuaternion(desiredWorld);
      const socketOriginWorld = nock.clone().sub(nockOffset);
      handArrow.socket.position.copy(handArrow.socket.parent.worldToLocal(socketOriginWorld));
      handArrow.socket.updateMatrixWorld(true);
    }

    function updateArrowProjectile(handArrow, state) {
      const projectile = actor.projectile;
      if (!projectile) return;
      const clipName = actor.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      const isTripleShot = clipName === BOW_TRIPLE_SHOT_NAME;
      const releaseTime = isTripleShot ? BOW_TIMING.tripleRelease : BOW_RELEASE_TIMING.release;
      const isReleasedShot = (clipName === BOW_RELEASE_NAME || isTripleShot) && state.firedThisPreview;
      if (!isReleasedShot) {
        for (const visual of projectile.visuals) visual.visible = false;
        projectile.captured = false;
        projectile.distanceMeters = 0;
        return;
      }
      if (!projectile.captured) {
        alignHandArrow(handArrow);
        handArrow.socket.getWorldPosition(projectile.startPosition);
        handArrow.socket.getWorldQuaternion(projectile.startQuaternion);
        projectile.direction.copy(ARROW_FLIGHT_AXIS).applyQuaternion(projectile.startQuaternion).normalize();
        projectile.captured = true;
      }
      const phase = THREE.MathUtils.clamp((normalizedTime - releaseTime) / (1 - releaseTime), 0, 1);
      projectile.distanceMeters = phase * 6;
      const projectileCount = isTripleShot ? state.firedArrowCount : 1;
      const spreads = projectileCount === 3 ? [-0.075, 0, 0.075] : projectileCount === 2 ? [-0.045, 0.045] : [0];
      projectile.visuals.forEach((visual, index) => {
        visual.visible = index < projectileCount;
        if (!visual.visible) return;
        const direction = projectile.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreads[index]);
        visual.position.copy(projectile.startPosition).addScaledVector(direction, projectile.distanceMeters);
        visual.position.y -= phase * phase * 0.65;
        visual.quaternion.copy(arrowWorldQuaternion(direction));
        localizeWorldTransform(visual);
        visual.updateMatrixWorld(true);
      });
    }

    function updateBowInventoryPreview() {
      if (!actor) return;
      const enabled = !(settings.mode === "catalog") && settings.loadoutId === "bow";
      const state = bowArrowState();
      const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && /arrow/i.test(asset));
      if (handArrow) {
        alignHandArrow(handArrow);
        handArrow.visual.visible = enabled && state.handArrowVisible;
        actor.handArrowExtras.forEach((visual, index) => {
          visual.visible = enabled && state.handArrowCount >= index + 2;
        });
        updateArrowProjectile(handArrow, enabled ? state : { ...state, firedThisPreview: false });
      } else if (actor.projectile) {
        for (const visual of actor.projectile.visuals) visual.visible = false;
        actor.projectile.captured = false;
      }
      if (actor.arrowBundle) {
        for (const mesh of actor.arrowBundle.meshes) mesh.count = enabled ? state.displayedInQuiver : 0;
        Object.assign(actor.arrowBundle, state, { totalInventory: state.inventory });
      }
      updateBowString(actor, enabled ? state : { ...state, handArrowVisible: false });
      return state;
    }

    function addAttachment(actor, preparedAssets, attachment) {
      const bone = findBone(actor.bones, attachment.bone);
      if (!bone) throw new Error(`Missing socket bone ${attachment.bone}.`);
      const prepared = preparedAssets.get(attachment.asset);
      const socket = new THREE.Group();
      socket.name = `weapon-socket-${attachment.role}-${attachment.asset}`;
      const actorScale = actor.model.scale.x;
      socket.scale.setScalar(1 / actorScale);
      socket.position.fromArray(attachment.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale);
      socket.rotation.fromArray(attachment.rotation ?? [0, 0, 0]);
      const visual = prepared.visual.clone(true);
      visual.visible = attachment.visible !== false;
      if (Array.isArray(attachment.scale)) visual.scale.fromArray(attachment.scale);
      else if (Number.isFinite(attachment.scale)) visual.scale.setScalar(attachment.scale);
      socket.add(visual);
      bone.add(socket);
      const record = {
        ...structuredClone(attachment),
        socket,
        visual,
        prepared,
        activeBone: attachment.bone,
        activePose: attachment.poses ? "hand" : "fixed",
      };
      actor.sockets.push(record);
      if (attachment.role === "primary") actor.primary = record;
      return record;
    }

    function removeOverlay(actor) {
      for (const [bone, quaternion] of actor.overlay) bone.quaternion.multiply(quaternion.clone().invert());
      actor.overlay.clear();
      for (const [bone, quaternion] of actor.fittedOverlayBase) bone.quaternion.copy(quaternion);
      actor.fittedOverlayBase.clear();
    }

    function applyHandOverlay(actor, side, inputs, thumbInputForSide) {
      // Raw catalog samples must not inherit equipment fitting or manual grip.
      if (settings.mode === "catalog") return;
      const euler = new THREE.Euler();
      const fitted = FITTED_GRIP_LOADOUTS.has(settings.loadoutId)
        && (side === "Right" || settings.loadoutId === "daggers"
          || (["staff", "mace"].includes(settings.loadoutId) && twoHandIKAllowed()));
      if (!fitted) {
        applyAdditiveHumanHandGrip([...actor.bones.values()], side,
          Object.fromEntries(Object.entries(inputs).map(([finger, input]) => [finger, Number(input)])),
          Number(thumbInputForSide), actor.overlay);
        return;
      }
      const applyFingerRotation = (bone, rotation) => {
        if (fitted) {
          if (!actor.fittedOverlayBase.has(bone)) actor.fittedOverlayBase.set(bone, bone.quaternion.clone());
          bone.quaternion.copy(actor.bindFingerQuaternions.get(bone.name) ?? actor.fittedOverlayBase.get(bone));
          bone.quaternion.multiply(rotation).normalize();
        }
      };
      for (const [finger, input] of Object.entries(inputs)) {
        const angle = Number(input);
        for (const segment of [1, 2, 3]) {
          const bone = findBone(actor.bones, `${side}Hand${finger}${segment}`);
          if (!bone) continue;
          const narrowHandle = ["knife", "daggerSingle", "daggers", "rod"].includes(settings.loadoutId);
          const segmentWeight = fitted ? (narrowHandle ? [1.2, 1.4, 1.2] : [1.2, 1.2, 1])[segment - 1] : 1;
          const additive = new THREE.Quaternion().setFromEuler(euler.set(angle * segmentWeight, 0, 0, "XYZ"));
          applyFingerRotation(bone, additive);
        }
      }
      const thumb = Number(thumbInputForSide);
      const mirror = side === "Left" ? -1 : 1;
      const thumb1 = findBone(actor.bones, `${side}HandThumb1`);
      const thumb2 = findBone(actor.bones, `${side}HandThumb2`);
      if (thumb1) {
        const additive = new THREE.Quaternion().setFromEuler(euler.set(thumb * 0.45, -thumb * mirror, thumb * 0.3 * mirror));
        applyFingerRotation(thumb1, additive);
      }
      if (thumb2) {
        const additive = new THREE.Quaternion().setFromEuler(euler.set(thumb * 0.65, 0, -thumb * 0.25 * mirror));
        applyFingerRotation(thumb2, additive);
      }
      if (fitted) {
        const hand = findBone(actor.bones, `${side}Hand`);
        const tip = findBone(actor.bones, `${side}HandThumb4`);
        const links = [3, 2, 1].map((segment) => findBone(actor.bones, `${side}HandThumb${segment}`)).filter(Boolean);
        // Source caster clips spread the thumb. A bind-relative opposition target
        // closes it onto the outside of the index finger instead of into the shaft.
        if (links[0]) applyFingerRotation(links[0], new THREE.Quaternion());
        actor.model.updateMatrixWorld(true);
        const wandGrip = settings.loadoutId === "rod";
        if (wandGrip && thumb1 && thumb2) {
          // Thin wands need thumb opposition from the palm, not the large open
          // C-shaped thumb arc used to wrap a sword/staff handle.
          const origin = thumb1.getWorldPosition(new THREE.Vector3());
          const thumbRootTarget = hand.localToWorld(new THREE.Vector3(0.035 * mirror, 0.035, 0.02).multiplyScalar(1 / actor.model.scale.x));
          const delta = new THREE.Quaternion().setFromUnitVectors(
            thumb2.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(), thumbRootTarget.sub(origin).normalize(),
          );
          const desired = delta.multiply(thumb1.getWorldQuaternion(new THREE.Quaternion()));
          thumb1.quaternion.copy(thumb1.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
        }
        const thumbTarget = wandGrip ? [0.01 * mirror, 0.064, 0.038] : [0.025 * mirror, 0.062, 0.05];
        const target = hand.localToWorld(new THREE.Vector3().fromArray(thumbTarget).multiplyScalar(1 / actor.model.scale.x));
        for (let iteration = 0; tip && iteration < 8; iteration += 1) {
          for (const bone of wandGrip ? links.slice(0, 2) : links) {
            hand.updateWorldMatrix(true, true);
            const origin = bone.getWorldPosition(new THREE.Vector3());
            const delta = new THREE.Quaternion().setFromUnitVectors(
              tip.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(), target.clone().sub(origin).normalize(),
            );
            const desired = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
            bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
          }
        }
      }
    }

    function applyOverlay(actor) {
      const { thumb: rightThumb, ...rightFingers } = settings.calibration.grip;
      const { thumb: leftThumb, ...leftFingers } = settings.calibration.leftGrip;
      applyHandOverlay(actor, "Right", rightFingers, rightThumb);
      applyHandOverlay(actor, "Left", leftFingers, leftThumb);
      actor.model.updateMatrixWorld(true);
    }

    function removeTwoHandIK(actor) {
      for (const [bone, quaternion] of actor.ikBase) bone.quaternion.copy(quaternion);
      actor.ikBase.clear();
      actor.model.updateMatrixWorld(true);
    }

    function solveGreatswordSheatheArm(actor, side, targetWorld) {
      const hand = findBone(actor.bones, `${side}Hand`);
      const shoulder = findBone(actor.bones, `${side}Shoulder`);
      const links = [`${side}ForeArm`, `${side}Arm`]
        .map((name) => findBone(actor.bones, name))
        .filter(Boolean);
      if (!hand || !shoulder || links.length < 2) return;
      for (const link of [...links, shoulder, hand]) {
        if (!actor.ikBase.has(link)) actor.ikBase.set(link, link.quaternion.clone());
      }
      const linkPosition = new THREE.Vector3();
      const handPosition = new THREE.Vector3();
      const towardHand = new THREE.Vector3();
      const towardTarget = new THREE.Vector3();
      const linkWorld = new THREE.Quaternion();
      const parentWorld = new THREE.Quaternion();
      const deltaWorld = new THREE.Quaternion();
      const desiredWorld = new THREE.Quaternion();
      actor.model.updateMatrixWorld(true);
      shoulder.getWorldPosition(linkPosition);
      hand.getWorldPosition(handPosition);
      towardHand.copy(handPosition).sub(linkPosition);
      towardTarget.copy(targetWorld).sub(linkPosition);
      if (towardHand.lengthSq() >= 1e-8 && towardTarget.lengthSq() >= 1e-8) {
        deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
        shoulder.getWorldQuaternion(linkWorld);
        desiredWorld.copy(deltaWorld).multiply(linkWorld);
        shoulder.parent.getWorldQuaternion(parentWorld);
        const solvedShoulder = parentWorld.invert().multiply(desiredWorld).normalize();
        shoulder.quaternion.copy(actor.ikBase.get(shoulder)).slerp(solvedShoulder, 0.52);
      }
      for (let iteration = 0; iteration < 28; iteration += 1) {
        for (const link of links) {
          actor.model.updateMatrixWorld(true);
          link.getWorldPosition(linkPosition);
          hand.getWorldPosition(handPosition);
          towardHand.copy(handPosition).sub(linkPosition);
          towardTarget.copy(targetWorld).sub(linkPosition);
          if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
          deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
          link.getWorldQuaternion(linkWorld);
          desiredWorld.copy(deltaWorld).multiply(linkWorld);
          link.parent.getWorldQuaternion(parentWorld);
          link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
        }
      }
    }

    function orientGreatswordSheatheHand(actor, side, socketWorldQuaternion) {
      const state = actor.greatswordSheathe;
      const hand = findBone(actor.bones, `${side}Hand`);
      const relative = state?.handRelative?.[side];
      if (!hand || !relative) return;
      const desiredWorld = socketWorldQuaternion.clone().multiply(relative);
      const parentWorld = hand.parent.getWorldQuaternion(new THREE.Quaternion());
      hand.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
    }

    function applyTwoHandIK(actor) {
      const clipName = actor.action?.getClip().name;
      // Reset the mesh center before all early returns, including one-hand/caster
      // actions and disabled IK. The two-hand fit then centers it between palms.
      centerStaffVisual(actor);
      if (!(settings.mode === "catalog") && settings.loadoutId === "staff" && clipName?.startsWith("ProMagic__")) {
        fitCasterStaffHand(actor, findBone);
        return;
      }
      if (!settings.calibration.twoHandLock.enabled || !twoHandIKAllowed(clipName)) return;
      if (settings.loadoutId === "staff") {
        actor.staffGripFit = fitStaffToSourceHands(actor, findBone, settings.staffGrip);
        return;
      }
      if (settings.loadoutId === "mace") {
        actor.maceGripFit = fitMaceBlockSupport(actor, findBone);
        return;
      }
      if (clipName === GREATSWORD_TWO_HAND_SHEATHE_NAME && actor.greatswordSheathe) {
        const socket = actor.primary.socket;
        const state = actor.greatswordSheathe;
        actor.model.updateMatrixWorld(true);
        socket.updateMatrixWorld(true);
        const rightTargetWorld = socket.localToWorld(state.rightGripLocal.clone());
        const normalizedTime = settings.normalizedTime;
        const gripTighten = THREE.MathUtils.smoothstep(normalizedTime, 0.48, 0.64)
          * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.82, 0.98));
        state.leftGripLocal = twoHandGripTarget.clone().lerp(new THREE.Vector3(-0.016, -0.055, 0.01), gripTighten);
        const leftTargetWorld = socket.localToWorld(state.leftGripLocal.clone());
        solveGreatswordSheatheArm(actor, "Right", rightTargetWorld);
        solveGreatswordSheatheArm(actor, "Left", leftTargetWorld);
        actor.model.updateMatrixWorld(true);
        const socketWorldQuaternion = socket.getWorldQuaternion(new THREE.Quaternion());
        orientGreatswordSheatheHand(actor, "Right", socketWorldQuaternion);
        orientGreatswordSheatheHand(actor, "Left", socketWorldQuaternion);
        actor.model.updateMatrixWorld(true);
        return;
      }
      solveGreatswordSupportGrip(actor.model, [...actor.bones.values()], actor.primary.socket,
        actor.ikBase, twoHandGripTarget, twoHandWristCorrection);
    }

    function removeBowDrawIK(actor) {
      for (const [bone, quaternion] of actor.bowIKBase) bone.quaternion.copy(quaternion);
      actor.bowIKBase.clear();
      actor.model.updateMatrixWorld(true);
    }

    function applyBowDrawIK(actor) {
      if ((settings.mode === "catalog") || settings.loadoutId !== "bow") return;
      const clipName = actor.action?.getClip().name ?? "";
      const normalizedTime = settings.normalizedTime;
      const isArrowDraw = clipName === BOW_QUIVER_DRAW_NAME;
      const isTripleDraw = clipName === BOW_TRIPLE_SHOT_NAME && normalizedTime <= BOW_TIMING.tripleArrowNocked;
      const isBowStrike = clipName === BOW_STRIKE_NAME;
      const isEquip = clipName.endsWith("BowEquipFromBack");
      const isStow = clipName.endsWith("BowStowToBack");
      if (!isArrowDraw && !isTripleDraw && !isBowStrike && !isEquip && !isStow) return;

      let side;
      let targetWorld;
      let reachWeight;
      if (isBowStrike) {
        const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
        if (!bow) return;
        side = "Right";
        targetWorld = bow.socket.localToWorld(new THREE.Vector3(0, -0.09, 0.02));
        reachWeight = THREE.MathUtils.smoothstep(normalizedTime, 0.12, BOW_STRIKE_TIMING.windupEnd)
          * (1 - THREE.MathUtils.smoothstep(normalizedTime, BOW_STRIKE_TIMING.recoverStart, 0.92));
      } else if (isArrowDraw || isTripleDraw) {
        if (!actor.arrowBundle?.pickupLocal) return;
        side = "Right";
        const leftHand = findBone(actor.bones, "LeftHand");
        const rightHand = findBone(actor.bones, "RightHand");
        if (!leftHand || !rightHand) return;
        actor.model.updateMatrixWorld(true);
        const fingerNock = drawFingerNockWorld(actor) ?? rightHand.getWorldPosition(new THREE.Vector3());
        const quiverDirection = ARROW_FLIGHT_AXIS.clone().applyQuaternion(
          actor.arrowBundle.socket.getWorldQuaternion(new THREE.Quaternion()),
        ).normalize();
        const pickup = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone());
        const transferTime = isTripleDraw
          ? THREE.MathUtils.lerp(
            BOW_DRAW_TIMING.featherGrip,
            BOW_DRAW_TIMING.nocked,
            THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
          )
          : normalizedTime;
        const transfer = bowArrowTransferPose(
          actor,
          pickup,
          fingerNock,
          transferTime,
          quiverDirection,
          leftHand.getWorldPosition(new THREE.Vector3()),
        );
        targetWorld = transfer.nock.clone();
        reachWeight = THREE.MathUtils.smoothstep(transferTime, BOW_DRAW_TIMING.reachStart, BOW_DRAW_TIMING.featherGrip);
      } else {
        const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
        const backPose = bow?.poses?.back;
        const backBone = backPose ? findBone(actor.bones, backPose.bone) : null;
        if (!backPose || !backBone) return;
        side = "Left";
        targetWorld = backBone.localToWorld(
          new THREE.Vector3().fromArray(backPose.position).multiplyScalar(1 / actor.model.scale.x),
        );
        reachWeight = isEquip
          ? THREE.MathUtils.smoothstep(normalizedTime, 0.16, 0.28) * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.34, 0.46))
          : THREE.MathUtils.smoothstep(normalizedTime, 0.24, 0.36) * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.42, 0.54));
      }
      if (reachWeight <= 0) return;

      const hand = findBone(actor.bones, `${side}Hand`);
      const linkNames = (isArrowDraw || isTripleDraw)
        ? [`${side}Hand`, `${side}ForeArm`, `${side}Arm`, `${side}Shoulder`]
        : [`${side}ForeArm`, `${side}Arm`, `${side}Shoulder`];
      const links = linkNames
        .map((name) => findBone(actor.bones, name))
        .filter(Boolean);
      if (!hand || links.length < 2) return;

      actor.model.updateMatrixWorld(true);
      for (const link of links) actor.bowIKBase.set(link, link.quaternion.clone());
      const linkPosition = new THREE.Vector3();
      const handPosition = new THREE.Vector3();
      const towardHand = new THREE.Vector3();
      const towardTarget = new THREE.Vector3();
      const linkWorld = new THREE.Quaternion();
      const parentWorld = new THREE.Quaternion();
      const deltaWorld = new THREE.Quaternion();
      const desiredWorld = new THREE.Quaternion();

      // Fingertip/pinch IK needs a few more passes than wrist IK because the
      // effector sits at the end of the articulated hand, behind the shoulder at
      // pickup. Extra deterministic passes remove the several-centimeter miss.
      for (let iteration = 0; iteration < 28; iteration += 1) {
        for (const link of links) {
          actor.model.updateMatrixWorld(true);
          link.getWorldPosition(linkPosition);
          if (isArrowDraw || isTripleDraw) {
            handPosition.copy(drawFingerNockWorld(actor) ?? hand.getWorldPosition(new THREE.Vector3()));
          } else {
            hand.getWorldPosition(handPosition);
          }
          towardHand.copy(handPosition).sub(linkPosition);
          towardTarget.copy(targetWorld).sub(linkPosition);
          if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
          deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
          link.getWorldQuaternion(linkWorld);
          desiredWorld.copy(deltaWorld).multiply(linkWorld);
          link.parent.getWorldQuaternion(parentWorld);
          link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
        }
      }
      for (const link of links) {
        const solved = link.quaternion.clone();
        link.quaternion.copy(actor.bowIKBase.get(link)).slerp(solved, reachWeight);
      }
      actor.model.updateMatrixWorld(true);
    }

    const DEFAULT_TWO_HAND_TARGET = [-0.024, -0.09, 0.016];
    const DEFAULT_TWO_HAND_WRIST = [0.4, 0, 0];
    const TWO_HAND_DEFAULTS_BY_LOADOUT = {
      longswordTwoHand: { target: DEFAULT_TWO_HAND_TARGET, wrist: DEFAULT_TWO_HAND_WRIST },
      staff: { target: [-0.062, 0.32, -0.03], wrist: [0, 0, -Math.PI / 2] },
    };

    function twoHandIKAllowed(clipName = actor?.action?.getClip().name) {
      if ((settings.mode === "catalog") || !actor?.primary) return false;
      if (settings.loadoutId === "staff") return staffUsesSupportHand(clipName);
      if (settings.loadoutId === "mace") return maceUsesSupportHand(clipName);
      return settings.loadoutId === "longswordTwoHand" && !GREATSWORD_BACK_TRANSITIONS.has(clipName);
    }

    function twoHandDefaultsForLoadout() {
      return TWO_HAND_DEFAULTS_BY_LOADOUT[settings.loadoutId]
        ?? { target: DEFAULT_TWO_HAND_TARGET, wrist: DEFAULT_TWO_HAND_WRIST };
    }

    function updateSocketFromControls() {
      if (!actor?.primary) return;
      const actorScale = actor.model.scale.x;
      actor.primary.socket.position.set(
        Number(settings.calibration.socket.x) / actorScale,
        Number(settings.calibration.socket.y) / actorScale,
        Number(settings.calibration.socket.z) / actorScale,
      );
      actor.primary.socket.rotation.set(
        Number(settings.calibration.socket.rx),
        Number(settings.calibration.socket.ry),
        Number(settings.calibration.socket.rz),
      );
      actor.primary.visual.scale.setScalar(Number(settings.calibration.socket.scale));
      if (actor.primary.asset === "staff") {
        actor.primary.visual.scale.x *= ASSET_SPECS.staff.radialScale;
        actor.primary.visual.scale.z *= ASSET_SPECS.staff.radialScale;
      }
      actor.model.updateMatrixWorld(true);
    }

    function setAttachmentTransform(role, transform = {}) {
      assertAlive();
      const record = actor.sockets.find((candidate) => candidate.role === role);
      if (!record) return false;
      const actorScale = actor.model.scale.x;
      if (Array.isArray(transform.position)) {
        record.socket.position.fromArray(transform.position).multiplyScalar(1 / actorScale);
      }
      if (Array.isArray(transform.rotation)) record.socket.rotation.fromArray(transform.rotation);
      if (Array.isArray(transform.scale)) record.visual.scale.fromArray(transform.scale);
      else if (Number.isFinite(transform.scale)) record.visual.scale.setScalar(transform.scale);
      rememberEquipmentTransform(record.socket);
      actor.model.updateMatrixWorld(true);
      if (role === "harness") updateQuiverHarness(actor);
      return true;
    }

    function setArrowBundleTransform({ position, rotation } = {}) {
      assertAlive();
      if (!actor.arrowBundle) return false;
      const socket = actor.arrowBundle.socket;
      if (position) socket.position.fromArray(position).multiplyScalar(1 / actor.model.scale.x);
      if (rotation) socket.rotation.fromArray(rotation);
      rememberEquipmentTransform(socket);
      socket.updateMatrixWorld(true);
      updateBowInventoryPreview();
      return true;
    }

    function defaultActionCalibration(clipName) {
      if ((settings.mode === "catalog")) {
        return {
          grip: { ...OPEN_GRIP },
          leftGrip: { ...OPEN_GRIP },
          socket: null,
          twoHandLock: { enabled: false, target: [...DEFAULT_TWO_HAND_TARGET], wrist: [...DEFAULT_TWO_HAND_WRIST] },
        };
      }
      const actionPreset = ACTION_PRESETS[clipName]
        ?? (clipName.startsWith("GreatSword__") ? ACTION_PRESETS.GreatSword__GreatSwordAttack : null);
      const loadoutPreset = LOADOUT_GRIP_PRESETS[settings.loadoutId];
      const twoHandDefaults = twoHandDefaultsForLoadout();
      const attachment = (settings.mode === "catalog" ? CATALOG_LOADOUT : LOADOUTS[settings.loadoutId]).attachments.find(({ role }) => role === "primary");
      const position = attachment?.position ?? [0, 0, 0];
      const rotation = attachment?.rotation ?? [0, 0, 0];
      return {
        grip: { ...(actionPreset?.grip ?? loadoutPreset?.right ?? OPEN_GRIP) },
        leftGrip: { ...(["staff", "mace"].includes(settings.loadoutId)
          ? (twoHandIKAllowed(clipName) ? FITTED_HAND_GRIP : OPEN_GRIP)
          : (actionPreset?.leftGrip ?? loadoutPreset?.left ?? OPEN_GRIP)) },
        socket: actor.primary ? (actionPreset?.socket ?? {
          x: position[0], y: position[1], z: position[2],
          rx: rotation[0], ry: rotation[1], rz: rotation[2], scale: 1,
        }) : null,
        twoHandLock: {
          enabled: twoHandIKAllowed(clipName),
          target: [...twoHandDefaults.target],
          wrist: [...twoHandDefaults.wrist],
        },
      };
    }


    const actor = createActor(bodySource, sharedClips ?? sourceClips);
    actor.sourceClipCount = sourceClips.length;
    if (!sharedClips) {
      addAuthoredGapClips(actor);
      for (const clip of buildCarryLocomotionClips(actor.clips)) actor.clips.set(clip.name, clip);
      sharedClips = [...actor.clips.values()];
      sharedAuthoredCount = actor.authoredGapCount;
    }
    actor.authoredGapCount = sharedAuthoredCount;
    const sourceNames = new Set(sourceClips.map((clip) => clip.name));
    const sourceBonePose = [...actor.bones.values()].map((bone) => ({
      bone, position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    }));
    settings.calibration = structuredClone(defaultActionCalibration(sourceClips[0]?.name ?? ""));
    function syncCalibrationVectors() {
      twoHandGripTarget.fromArray(settings.calibration.twoHandLock.target);
      twoHandWristCorrection.set(...settings.calibration.twoHandLock.wrist, "XYZ");
    }
    function disposeModel(model) {
      const release = (resource) => {
        if (!resource || cachedResources.has(resource) || releasedInstanceResources.has(resource)) return;
        releasedInstanceResources.add(resource);
        resource.dispose?.();
      };
      model.traverse((object) => {
        if (!object.isMesh) return;
        release(object.geometry);
        for (const material of (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean)) {
          for (const value of Object.values(material)) if (value?.isTexture) release(value);
          release(material);
        }
      });
    }
    function calibrationKey(clipName) { return `${settings.mode === "catalog" ? "catalog" : settings.loadoutId}::${clipName}`; }
    function getCalibration(clipName = actor.action?.getClip().name ?? "") {
      return structuredClone(actionCalibrationStates.get(calibrationKey(clipName)) ?? defaultActionCalibration(clipName));
    }
    function setCalibration(patch, { remember = true, evaluate = false } = {}) {
      assertAlive();
      const next = structuredClone(settings.calibration);
      for (const part of ["grip", "leftGrip", "socket", "twoHandLock"]) {
        if (patch[part] === null) next[part] = null;
        else if (patch[part]) next[part] = { ...next[part], ...structuredClone(patch[part]) };
      }
      const finiteValues = (value) => {
        if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Human calibration requires finite numeric values.");
        if (value && typeof value === "object") Object.values(value).forEach(finiteValues);
      };
      finiteValues(next);
      const vectorIsFinite = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
      const gripIsFinite = (value) => value && Object.keys(OPEN_GRIP).every((key) => Number.isFinite(value[key]));
      if (!gripIsFinite(next.grip) || !gripIsFinite(next.leftGrip) || !next.twoHandLock
        || typeof next.twoHandLock.enabled !== "boolean"
        || !vectorIsFinite(next.twoHandLock.target) || !vectorIsFinite(next.twoHandLock.wrist)
        || (next.socket && !["x", "y", "z", "rx", "ry", "rz", "scale"].every((key) => Number.isFinite(next.socket[key])))) {
        throw new Error("Invalid human calibration.");
      }
      settings.calibration = next;
      syncCalibrationVectors();
      if (remember && activeActionCalibrationKey) actionCalibrationStates.set(activeActionCalibrationKey, structuredClone(next));
      if (evaluate && actor.action) sample(actor.action.getClip().name, actor.action.time);
    }
    function updateSettings(patch) {
      assertAlive();
      if (Number.isFinite(patch.normalizedTime)) settings.normalizedTime = THREE.MathUtils.clamp(patch.normalizedTime, 0, 1);
      if (Number.isFinite(patch.arrowCount)) settings.arrowCount = THREE.MathUtils.clamp(Math.round(patch.arrowCount), 0, 100);
      if (patch.staffGrip) {
        const next = { ...settings.staffGrip, ...patch.staffGrip };
        if (!Number.isFinite(next.spread) || !Number.isFinite(next.roll)) throw new Error("Invalid staff grip.");
        settings.staffGrip = next;
      }
      if (patch.calibration) setCalibration(patch.calibration, { remember: false });
    }
    function restoreActionCalibration(clipName) {
      activeActionCalibrationKey = calibrationKey(clipName);
      settings.calibration = getCalibration(clipName);
      syncCalibrationVectors();
      if (settings.calibration.socket && actor.primary) updateSocketFromControls();
    }
    function clearEquipment() {
      removeOverlay(actor); removeTwoHandIK(actor); removeBowDrawIK(actor);
      actor.mixer.stopAllAction(); actor.action = null;
      disposeArrowBundle(actor); disposeQuiverHarness(actor); disposeHandArrowExtras(actor); disposeArrowProjectile(actor);
      actor.bowString = null; actor.greatswordSheathe = null;
      for (const { socket, visual } of actor.sockets) { socket.removeFromParent(); disposeModel(visual); }
      for (const prepared of preparedAssets.values()) disposeModel(prepared.visual);
      preparedAssets = new Map();
      actor.sockets = []; actor.primary = null; equipmentBaseline = [];
      activeActionCalibrationKey = null;
    }
    async function setLoadout(loadoutId, { mode = "equipment" } = {}) {
      assertAlive();
      if (mode !== "equipment" && mode !== "catalog") throw new Error("Unknown human review mode.");
      if (!LOADOUTS[loadoutId]) throw new Error(`Unknown human loadout: ${loadoutId}`);
      const loadRevision = ++revision;
      clearEquipment();
      settings.loadoutId = loadoutId; settings.mode = mode;
      const loadout = mode === "catalog" ? CATALOG_LOADOUT : LOADOUTS[loadoutId];
      const names = [...new Set(loadout.attachments.map(({ asset }) => asset))];
      const missing = names.filter((name) => REQUIRED_PREVIEW_TEXTURE_ASSETS.has(name) && !PREVIEW_TEXTURE_URLS[name]);
      if (missing.length) throw new Error(`Placeholder prevention gate: missing browser texture derivative for ${missing.join(", ")}.`);
      const loaded = await Promise.all(names.map(async (name) => {
        const [source, texture] = await Promise.all([
          loadModel(URLS[name]), PREVIEW_TEXTURE_URLS[name] ? loadTexture(PREVIEW_TEXTURE_URLS[name]) : null,
        ]);
        return { name, source, texture };
      }));
      if (disposed || loadRevision !== revision) return false;
      try {
        for (const { name, source, texture } of loaded) {
          const prepared = prepareAsset(source.scene, name);
          preparedAssets.set(name, prepared);
          const materialCopies = new Map();
          prepared.visual.traverse((object) => {
            if (!object.isMesh) return;
            const cloneMaterial = (material) => {
              if (!materialCopies.has(material)) {
                // Planar preparation already made an instance-owned material.
                const replacement = cachedResources.has(material) ? material.clone() : material;
                if (texture && !prepared.usesCleanLeatherTexture) {
                  replacement.map = texture; replacement.color.set(0xffffff); replacement.needsUpdate = true;
                }
                materialCopies.set(material, replacement);
              }
              return materialCopies.get(material);
            };
            object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
          });
          let meshCount = 0;
          const untextured = [];
          prepared.visual.traverse((object) => {
            if (!object.isMesh) return;
            meshCount += 1;
            if ((Array.isArray(object.material) ? object.material : [object.material]).some((material) => !material?.map)) untextured.push(object.name || `mesh-${meshCount}`);
          });
          if (!meshCount || untextured.length) throw new Error(`Placeholder prevention gate: ${name} has ${meshCount ? `untextured mesh material(s): ${untextured.join(", ")}` : "no renderable mesh"}.`);
        }
        loadout.attachments.forEach((attachment) => addAttachment(actor, preparedAssets, attachment));
        buildBowStringRig(actor); buildArrowBundle(actor, preparedAssets); buildQuiverHarness(actor);
        buildHandArrowExtras(actor); buildArrowProjectile(actor, preparedAssets);
        equipmentBaseline = [...actor.sockets.map(({ socket }) => socket), actor.arrowBundle?.socket].filter(Boolean).map((object) => ({
          object, parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(),
        }));
        const first = actions()[0];
        if (!first) throw new Error("No source animations matched this human review selection.");
        selectAction(first.id);
        return true;
      } catch (error) {
        clearEquipment();
        throw error;
      }
    }
    function actionSemantic(name) {
      if (isDeathClip(name)) return "death";
      if (isDefenseClip(name)) return "block";
      if (isReactionClip(name)) return "reaction";
      const attack = isAttackClip(name);
      // A moving attack remains an attack. A whole source-family prefix such
      // as ProMagic is a catalog filter, not proof that every clip is a cast.
      if (!attack && isLocomotionClip(name)) return /Run|Sprint/i.test(clipActionName(name)) ? "run" : "walk";
      if (isIdleClip(name)) return "idle";
      if (attack) return "attack";
      if (isMagicClip(name)) return "cast";
      return "interaction";
    }
    /** @returns {readonly import("./combat-review-types").ReviewAction[]} */
    function actions() {
      const rows = settings.mode === "catalog"
        ? [...actor.clips.keys()].map((name) => [AUTHORED_GAP_LABELS.get(name) ?? `${sourcePrefix(name)} — ${clipActionName(name)}`, name])
        : [...ACTIONS[LOADOUTS[settings.loadoutId].actionFamily], ...locomotionActions(settings.loadoutId, actor.clips),
          ...(includeSourceResponses ? sourceResponseActions(settings.loadoutId, actor.clips) : [])];
      const seen = new Set();
      return rows.filter(([, name]) => actor.clips.has(name) && !seen.has(name) && seen.add(name)).map(([label, name]) => ({
        id: name, label, clipName: name, durationSeconds: actor.clips.get(name).duration,
        semantic: actionSemantic(name),
        approvalStatus: sourceNames.has(name) ? "source" : "draft",
        rootPolicy: "authored-displacement",
      }));
    }
    function rememberEquipmentTransform(object) {
      const pose = equipmentBaseline.find((entry) => entry.object === object);
      if (!pose) return;
      pose.parent = object.parent;
      pose.position.copy(object.position); pose.quaternion.copy(object.quaternion); pose.scale.copy(object.scale);
    }
    function restoreEquipmentBaseline() {
      for (const pose of equipmentBaseline) {
        if (pose.object.parent !== pose.parent) pose.parent.add(pose.object);
        pose.object.position.copy(pose.position); pose.object.quaternion.copy(pose.quaternion); pose.object.scale.copy(pose.scale);
        pose.object.visible = true;
      }
      actor.greatswordSheathe = null;
      if (actor.projectile) actor.projectile.captured = false;
      if (settings.calibration.socket && actor.primary) updateSocketFromControls();
    }
    function evaluateSource(clip, timeSeconds) {
      removeOverlay(actor); removeTwoHandIK(actor); removeBowDrawIK(actor);
      actor.mixer.stopAllAction();
      for (const pose of sourceBonePose) {
        pose.bone.position.copy(pose.position); pose.bone.quaternion.copy(pose.quaternion); pose.bone.scale.copy(pose.scale);
      }
      actor.action = actor.mixer.clipAction(clip);
      actor.action.reset().setLoop(THREE.LoopOnce, 1);
      actor.action.clampWhenFinished = true; actor.action.play();
      actor.action.time = timeSeconds; actor.action.paused = true;
      actor.mixer.update(0);
      settings.normalizedTime = clip.duration ? timeSeconds / clip.duration : 0;
      scene.updateWorldMatrix(true, true);
    }
    function applyPresentation() {
      updateGreatswordSheathePreview(); updateBowCarryPreview();
      applyOverlay(actor); applyBowDrawIK(actor); updateQuiverHarness(actor);
      applyTwoHandIK(actor); updateBowInventoryPreview(); enforceMountedArtifactClearance(actor);
      scene.updateWorldMatrix(true, true);
    }
    function sample(actionId, timeSeconds) {
      assertAlive();
      const clip = actor.clips.get(actionId);
      if (!clip) throw new Error(`Animation clip is missing: ${actionId}`);
      if (!Number.isFinite(timeSeconds)) throw new Error("Human review time must be finite.");
      if (activeActionCalibrationKey !== calibrationKey(actionId)) restoreActionCalibration(actionId);
      const time = THREE.MathUtils.clamp(timeSeconds, 0, clip.duration);
      restoreEquipmentBaseline();
      // Anchor procedural transfer/release to a fixed source time, not the last viewed frame.
      if (actionId === GREATSWORD_TWO_HAND_SHEATHE_NAME) {
        evaluateSource(clip, 0); applyPresentation();
      }
      if ((actionId === BOW_RELEASE_NAME || actionId === BOW_TRIPLE_SHOT_NAME)
        && time >= clip.duration * (actionId === BOW_RELEASE_NAME ? BOW_RELEASE_TIMING.release : BOW_TIMING.tripleRelease)) {
        const release = actionId === BOW_RELEASE_NAME ? BOW_RELEASE_TIMING.release : BOW_TIMING.tripleRelease;
        evaluateSource(clip, clip.duration * release); applyPresentation();
      }
      evaluateSource(clip, time); applyPresentation();
    }
    function selectAction(name, playback = {}) {
      setPlayback(playback);
      sample(name, 0);
      actor.action.paused = !playing;
      actor.action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    }
    function update(deltaSeconds) {
      assertAlive();
      if (!Number.isFinite(deltaSeconds)) throw new Error("Human review delta must be finite.");
      if (!actor.action) return;
      const clip = actor.action.getClip();
      // A paused actor still evaluates changed grip/calibration settings exactly.
      const raw = actor.action.time + (playing ? Math.max(0, deltaSeconds) * speed : 0);
      const time = playing && deltaSeconds > 0 && loop && clip.duration ? raw % clip.duration : Math.min(raw, clip.duration);
      sample(clip.name, time);
      actor.action.paused = !playing;
    }
    function setPlayback(value) {
      assertAlive();
      if (Number.isFinite(value.speed)) speed = THREE.MathUtils.clamp(value.speed, 0.05, 3);
      if (typeof value.loop === "boolean") loop = value.loop;
      if (typeof value.playing === "boolean") playing = value.playing;
      if (actor.action) actor.action.paused = !playing;
    }
    function reset() {
      assertAlive();
      const name = actor.action?.getClip().name ?? actions()[0]?.id;
      if (name) sample(name, 0);
    }
    function disposeInstance() {
      if (disposed) return;
      disposed = true; revision += 1;
      clearEquipment();
      const skeletons = new Set();
      actor.model.traverse((object) => { if (object.isSkinnedMesh) skeletons.add(object.skeleton); });
      for (const skeleton of skeletons) skeleton.dispose();
      actor.mixer.uncacheRoot(actor.model);
      disposeModel(actor.model);
      scene.removeFromParent(); scene.clear();
      actionCalibrationStates.clear();
      instances.delete(actor);
    }
    Object.assign(actor, {
      instanceId: options.instanceId, definitionId: "human-foundation-pilot", root: scene,
      bowStrikeTiming: BOW_STRIKE_TIMING,
      actions, sample, reset, dispose: disposeInstance, setLoadout, selectAction, update, setPlayback,
      updateSettings, getCalibration, setCalibration, setAttachmentTransform, setArrowBundleTransform,
      clearActionCalibration() { actionCalibrationStates.delete(activeActionCalibrationKey); },
      cancelPendingLoadout() { revision += 1; },
      snapshot: () => ({
        actionId: actor.action?.getClip().name ?? null, timeSeconds: actor.action?.time ?? 0,
        durationSeconds: actor.action?.getClip().duration ?? 0, normalizedTime: settings.normalizedTime,
        playing, speed, loop, loadoutId: settings.loadoutId, mode: settings.mode, calibrationKey: activeActionCalibrationKey,
      }),
      socketWorld(name, target) {
        const object = actor.sockets.find((record) => record.role === name || record.asset === name)?.socket
          ?? findBone(actor.bones, name);
        if (!object) return false;
        scene.updateWorldMatrix(true, true); object.getWorldPosition(target); return true;
      },
      // Existing solo diagnostics/calibration reuse the same mechanisms.
      reviewTools: {
        applyAttachmentPose, weaponHandContactMetrics, drawFingerNockWorld,
        minimumQuiverBodyClearance, minimumHarnessBodyClearance, artifactBodyClearanceMetrics,
        minimumHandArrowBodyClearance, handArrowCollisionMode, minimumHandArrowWristClearance,
        bowHandleContactMetrics, harnessBodyClearanceMetrics, minimumGreatswordBodyClearance,
        twoHandIKAllowed, updateSocketFromControls, removeOverlay, removeTwoHandIK,
        applyOverlay, applyTwoHandIK, updateBowInventoryPreview, enforceMountedArtifactClearance,
      },
    });
    return actor;
  }
  return { create, dispose };
}
