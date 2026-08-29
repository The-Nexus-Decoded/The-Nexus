import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyModularAppearance,
  cameraFollowStep,
  cameraPanBounds,
  cameraTileEnvelope,
  cloneActorMaterial,
  createTerminalDeathClip,
  deathBodyTilt,
  createStarterLongswordPresentation,
  MODULAR_APPEARANCE_PROVIDER_APPROVED,
  MODULAR_APPEARANCE_PROVIDER_STATUS_KEY,
  occlusionSampleHeights,
  resolvePointerHitIntent,
  screenPanToWorld,
  sanitizeAttackClip,
  setWeaponVisualState,
} from "../src/game/presentation";
import { HAIR_COLORS } from "../src/game/character";
import { generateSoulwellDungeon } from "../src/game/dungeon";

describe("actor presentation boundaries", () => {
  it("trims the malformed death recovery tail into a grounded semantic endpoint", () => {
    const source = new THREE.AnimationClip("DeathMixamo", 3, [
      new THREE.VectorKeyframeTrack("pelvis.position", [0, 0.6, 1.2, 1.8, 2.4, 3], [
        0, 1, 0,
        0, 0.7, 0,
        0, 0.2, 0,
        0, 0.8, 0,
        0, 1, 0,
        0, 1, 0,
      ]),
    ]);

    const normalized = createTerminalDeathClip(source, 0.4);

    expect(normalized.name).toBe("DeathBaseline");
    expect(normalized.duration).toBeCloseTo(1.2);
    const terminalTimes = Array.from(normalized.tracks[0]!.times);
    expect(terminalTimes).toHaveLength(3);
    expect(terminalTimes[0]).toBeCloseTo(0);
    expect(terminalTimes[1]).toBeCloseTo(0.6);
    expect(terminalTimes[2]).toBeCloseTo(1.2);
    expect(source.duration).toBe(3);
    expect(Array.from(source.tracks[0]!.times)).toHaveLength(6);
  });

  it("tips only the terminal death phase onto a horizontal support plane", () => {
    expect(deathBodyTilt(0)).toBeCloseTo(0);
    expect(deathBodyTilt(0.55)).toBeCloseTo(0);
    expect(deathBodyTilt(0.775)).toBeLessThan(-0.5);
    expect(deathBodyTilt(1)).toBeCloseTo(-Math.PI / 2);
  });

  it("preserves authored player color and emissive channels on an isolated clone", () => {
    const source = new THREE.MeshStandardMaterial({
      color: 0x98959a,
      emissive: 0x982709,
      emissiveIntensity: 1.4,
      roughness: 0.72,
      metalness: 0.05,
    });
    source.name = "SK_ashen_skin";

    const material = cloneActorMaterial(source, 0xc92f28, true) as THREE.MeshStandardMaterial;

    expect(material).not.toBe(source);
    expect(material.color.getHex()).toBe(source.color.getHex());
    expect(material.emissive.getHex()).toBe(source.emissive.getHex());
    expect(material.emissiveIntensity).toBe(source.emissiveIntensity);
    expect(material.roughness).toBe(source.roughness);
    expect(material.metalness).toBe(source.metalness);
  });

  it("fails closed instead of showing unapproved or legacy modular hair geometry", () => {
    const model = new THREE.Group();
    const unapprovedHair = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    unapprovedHair.name = "SK_Hair_Long";
    const legacyHair = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    legacyHair.name = "SK_SilverHairClump_01";
    const legacyBeard = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    legacyBeard.name = "SK_Beard_Full";
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x845a48 });
    skinMaterial.name = "Human_Skin";
    const skin = new THREE.Mesh(new THREE.BoxGeometry(), skinMaterial);
    skin.name = "SK_HumanHead";
    model.add(unapprovedHair, legacyHair, legacyBeard, skin);

    const result = applyModularAppearance(model, {
      hairStyle: "long",
      raceId: "human",
      facialHair: "full-beard",
      hairColor: "black",
    });

    expect(result.hair).toBe("missing-provider-asset");
    expect(result.facialHair).toBe("missing-provider-asset");
    expect(result.missingProviderAssets).toEqual(["SK_Hair_Long", "SK_FacialHair_FullBeard"]);
    expect(unapprovedHair.visible).toBe(false);
    expect(legacyHair.visible).toBe(false);
    expect(legacyBeard.visible).toBe(false);
    expect(skinMaterial.color.getHex()).toBe(0x845a48);
    expect(model.userData.modularAppearanceResult).toEqual(result);
  });

  it("applies approved modules, independent greying, and continuous adult age morphs", () => {
    const model = new THREE.Group();
    const approvedModule = (name: string): THREE.Mesh => {
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      material.name = `${name}_Tint`;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
      mesh.name = name;
      mesh.userData[MODULAR_APPEARANCE_PROVIDER_STATUS_KEY] = MODULAR_APPEARANCE_PROVIDER_APPROVED;
      return mesh;
    };
    const hair = approvedModule("SK_Hair_Cropped");
    const beard = approvedModule("SK_FacialHair_ShortBeard");
    const browMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    browMaterial.name = "Brow_Tint";
    const brows = new THREE.Mesh(new THREE.BoxGeometry(), browMaterial);
    brows.name = "SK_Brows";
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x5f3c31 });
    skinMaterial.name = "Human_Skin";
    const head = new THREE.Mesh(new THREE.BoxGeometry(), skinMaterial);
    head.name = "SK_HumanHead";
    head.morphTargetDictionary = { Age_Middle: 0, Age_Elder: 1 };
    head.morphTargetInfluences = [0, 0];
    model.add(hair, beard, brows, head);

    const result = applyModularAppearance(model, {
      hairStyle: "cropped",
      raceId: "human",
      facialHair: "short-beard",
      hairColor: "copper-red",
      age: 0.75,
      hairGreying: 0.25,
      facialHairGreying: 0.75,
    });

    const base = new THREE.Color(HAIR_COLORS["copper-red"].color);
    const grey = new THREE.Color(0xa8a39b);
    expect(result).toMatchObject({
      hair: "applied",
      facialHair: "applied",
      ageMorphsApplied: ["Age_Middle", "Age_Elder"],
      tintedMaterials: 3,
      missingProviderAssets: [],
    });
    expect(hair.visible).toBe(true);
    expect(beard.visible).toBe(true);
    expect((hair.material as THREE.MeshStandardMaterial).color.getHex())
      .toBe(base.clone().lerp(grey, 0.25).getHex());
    expect((beard.material as THREE.MeshStandardMaterial).color.getHex())
      .toBe(base.clone().lerp(grey, 0.75).getHex());
    expect(browMaterial.color.getHex()).toBe(base.clone().lerp(grey, 0.25).getHex());
    expect(head.morphTargetInfluences).toEqual([0.5, 0.5]);
    expect(skinMaterial.color.getHex()).toBe(0x5f3c31);
  });

  it("routes explicit hair and skin tint channels and replaces the legacy scalp map", async () => {
    const model = new THREE.Group();
    const detailMap = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const silverScalpMap = new THREE.Texture();
    silverScalpMap.name = "ScalpSilver";
    const skinScalpMap = new THREE.Texture<HTMLImageElement>();
    skinScalpMap.name = "ScalpSkin";
    const loadSpy = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((
      _url,
      onLoad,
    ) => {
      onLoad?.(skinScalpMap);
      return skinScalpMap;
    });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: detailMap, normalMap });
    hairMaterial.name = "MAT_HumanHair_Tintable";
    hairMaterial.userData.souldrifterTintChannel = "HAIR";
    const scalpMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: detailMap, normalMap });
    scalpMaterial.name = "MAT_HumanScalp_Underlay_Tintable";
    scalpMaterial.userData.souldrifterTintChannel = "SKIN";
    scalpMaterial.userData.souldrifterTintMode = "MATCH_RUNTIME_SKIN_TONE";
    const legacyHairMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    legacyHairMaterial.name = "MAT_LegacyHair_NoChannel";
    const unknownMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
    unknownMaterial.name = "MAT_UnknownTintChannel";
    unknownMaterial.userData.souldrifterTintChannel = "CLOTH";
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(),
      [hairMaterial, scalpMaterial, legacyHairMaterial, unknownMaterial],
    );
    hair.name = "SK_Hair_CurlyCoiled";
    hair.userData[MODULAR_APPEARANCE_PROVIDER_STATUS_KEY] = MODULAR_APPEARANCE_PROVIDER_APPROVED;

    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x684338, map: silverScalpMap });
    skinMaterial.name = "Human_Skin";
    const head = new THREE.Mesh(new THREE.BoxGeometry(), skinMaterial);
    head.name = "SK_HumanHead";
    model.add(hair, head);

    const result = applyModularAppearance(model, {
      hairStyle: "curly-coiled",
      raceId: "human",
      facialHair: "none",
      hairColor: "copper-red",
      hairGreying: 0.5,
      skinTone: "deep",
    });
    await Promise.resolve();

    const resolvedHair = new THREE.Color(HAIR_COLORS["copper-red"].color)
      .lerp(new THREE.Color(0xa8a39b), 0.5);
    expect(result.tintedMaterials).toBe(3);
    expect(hairMaterial.color.getHex()).toBe(resolvedHair.getHex());
    expect(legacyHairMaterial.color.getHex()).toBe(resolvedHair.getHex());
    expect(scalpMaterial.color.getHex()).toBe(skinMaterial.color.getHex());
    expect(unknownMaterial.color.getHex()).toBe(0x2e8b57);
    expect(hairMaterial.map).toBe(detailMap);
    expect(hairMaterial.normalMap).toBe(normalMap);
    expect(scalpMaterial.map).toBe(detailMap);
    expect(scalpMaterial.normalMap).toBe(normalMap);
    expect(skinMaterial.map).toBe(skinScalpMap);
    expect(model.userData.scalpShaved).toBe(false);
    expect(model.userData.scalpUsesSkinTexture).toBe(true);
    expect(loadSpy).toHaveBeenCalledOnce();
    loadSpy.mockRestore();
  });

  it("preserves legacy non-shaved scalp maps and the shaved skin-scalp baseline", () => {
    const createModel = (moduleName: string | null): {
      model: THREE.Group;
      skinMaterial: THREE.MeshStandardMaterial;
      silverScalpMap: THREE.Texture;
    } => {
      const model = new THREE.Group();
      const silverScalpMap = new THREE.Texture();
      silverScalpMap.name = "ScalpSilver";
      const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x684338, map: silverScalpMap });
      skinMaterial.name = "Human_Skin";
      const head = new THREE.Mesh(new THREE.BoxGeometry(), skinMaterial);
      head.name = "SK_HumanHead";
      model.add(head);
      if (moduleName) {
        const hairMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const hair = new THREE.Mesh(new THREE.BoxGeometry(), hairMaterial);
        hair.name = moduleName;
        hair.userData[MODULAR_APPEARANCE_PROVIDER_STATUS_KEY] = MODULAR_APPEARANCE_PROVIDER_APPROVED;
        model.add(hair);
      }
      return { model, skinMaterial, silverScalpMap };
    };

    const legacy = createModel("SK_Hair_TiedBack");
    applyModularAppearance(legacy.model, {
      hairStyle: "tied-back",
      raceId: "human",
      facialHair: "none",
      skinTone: "deep",
    });
    expect(legacy.skinMaterial.map).toBe(legacy.silverScalpMap);
    expect(legacy.model.userData.scalpShaved).toBe(false);
    expect(legacy.model.userData.scalpUsesSkinTexture).toBe(false);

    const shaved = createModel(null);
    applyModularAppearance(shaved.model, {
      hairStyle: "shaved-buzzed",
      raceId: "human",
      facialHair: "none",
      skinTone: "deep",
    });
    expect(shaved.skinMaterial.map).not.toBe(shaved.silverScalpMap);
    expect(shaved.skinMaterial.map?.name).toBe("ScalpSkin");
    expect(shaved.model.userData.scalpShaved).toBe(true);
    expect(shaved.model.userData.scalpUsesSkinTexture).toBe(true);
  });

  it("anchors the root, hips, and lower body without discarding attack choreography", () => {
    const times = [0, 1];
    const positions = [0, 0, 0, 0.25, 0.1, -0.4];
    const clip = new THREE.AnimationClip("SiphonCleave", 1, [
      new THREE.VectorKeyframeTrack("root.position", times, positions),
      new THREE.VectorKeyframeTrack("ElfShadowknight_Armature.position", times, positions),
      new THREE.VectorKeyframeTrack("pelvis.position", times, positions),
      new THREE.VectorKeyframeTrack("Hips.position", times, positions),
      new THREE.VectorKeyframeTrack("spine_01.position", times, positions),
      new THREE.QuaternionKeyframeTrack("spine_01.quaternion", times, [0, 0, 0, 1, 0.2, 0.2, 0, 0.96]),
      new THREE.QuaternionKeyframeTrack("neck_01.quaternion", times, [0, 0, 0, 1, 0.1, 0, 0.1, 0.98]),
      new THREE.QuaternionKeyframeTrack("Head.quaternion", times, [0, 0, 0, 1, 0, 0.1, 0.1, 0.98]),
      new THREE.QuaternionKeyframeTrack("clavicle_r.quaternion", times, [0, 0, 0, 1, 0.1, 0.2, 0, 0.97]),
      new THREE.QuaternionKeyframeTrack("upperarm_r.quaternion", times, [0, 0, 0, 1, 0.3, 0.1, 0, 0.94]),
      new THREE.QuaternionKeyframeTrack("lowerarm_r.quaternion", times, [0, 0, 0, 1, 0.2, 0.3, 0, 0.93]),
      new THREE.QuaternionKeyframeTrack("hand_r.quaternion", times, [0, 0, 0, 1, 0.1, 0.1, 0.2, 0.96]),
      new THREE.QuaternionKeyframeTrack("root.quaternion", times, [0, 0, 0, 1, 0, 0.2, 0, 0.98]),
      new THREE.QuaternionKeyframeTrack("thigh_l.quaternion", times, [0, 0, 0, 1, 0.1, 0.2, 0, 0.97]),
      new THREE.QuaternionKeyframeTrack("foot_r.quaternion", times, [0, 0, 0, 1, 0.2, 0, 0, 0.98]),
    ]);

    const sanitized = sanitizeAttackClip(clip);

    expect(sanitized).not.toBe(clip);
    expect(sanitized.tracks.map((track) => track.name)).toEqual([
      "root.position",
      "pelvis.position",
      "Hips.position",
      "spine_01.position",
      "spine_01.quaternion",
      "neck_01.quaternion",
      "Head.quaternion",
      "clavicle_r.quaternion",
      "upperarm_r.quaternion",
      "lowerarm_r.quaternion",
      "hand_r.quaternion",
      "thigh_l.quaternion",
      "foot_r.quaternion",
    ]);
    for (const name of ["root.position", "pelvis.position", "Hips.position"]) {
      const track = sanitized.tracks.find((candidate) => candidate.name === name);
      const values = Array.from(track?.values ?? []);
      expect(values.slice(0, 4)).toEqual([0, 0, 0, 0]);
      expect(values[4]).toBeCloseTo(0.1);
      expect(values[5]).toBe(0);
    }
    expect(clip.tracks).toHaveLength(15);
  });

  it("moves one modular starter sword between hidden, hip, and hand states", () => {
    const model = new THREE.Group();
    const pelvis = new THREE.Bone();
    pelvis.name = "pelvis";
    const hand = new THREE.Bone();
    hand.name = "hand_r";
    model.add(pelvis, hand);
    for (const part of ["Blade", "Grip", "Guard", "Pommel"]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.05));
      mesh.name = `SK_StarterLongsword_${part}`;
      hand.add(mesh);
    }

    const weapon = createStarterLongswordPresentation(model);
    expect(weapon).toBeDefined();
    expect(weapon?.state).toBe("hidden");
    expect(weapon?.handSocket.visible).toBe(false);
    expect(weapon?.hipSocket.visible).toBe(false);

    setWeaponVisualState(weapon!, "sheathed");
    expect(weapon?.handSocket.visible).toBe(false);
    expect(weapon?.hipSocket.visible).toBe(true);
    expect(weapon?.hipSocket.parent?.name).toBe("pelvis");

    setWeaponVisualState(weapon!, "drawn");
    expect(weapon?.handSocket.visible).toBe(true);
    expect(weapon?.hipSocket.visible).toBe(false);
  });
});

describe("camera pan boundaries", () => {
  it("maps screen-relative pan directions into world X/Z at the active azimuth", () => {
    const azimuth = Math.PI / 2;

    const right = screenPanToWorld(azimuth, 2, 0);
    const up = screenPanToWorld(azimuth, 0, 3);

    expect(right.x).toBeCloseTo(0, 6);
    expect(right.y).toBeCloseTo(-2, 6);
    expect(up.x).toBeCloseTo(3, 6);
    expect(up.y).toBeCloseTo(0, 6);
  });

  it("provides bounded reach to both sides of the authored training room", () => {
    const bounds = cameraPanBounds(16, 14, 1.75, 2);

    expect(bounds.x).toBeCloseTo(10.5);
    expect(bounds.y).toBeCloseTo(8.75);
    expect(new THREE.Vector2(99, -99).clamp(bounds.clone().multiplyScalar(-1), bounds).toArray())
      .toEqual([10.5, -8.75]);
  });

  it("soft-follows dead-zone overflow more tightly on compact viewports", () => {
    const initial = {
      center: new THREE.Vector2(0, 0),
      lookAhead: new THREE.Vector2(),
      manualOffset: new THREE.Vector2(),
      manualIdleSeconds: 0,
    };
    const baseFrame = {
      player: new THREE.Vector2(5, 0),
      movement: new THREE.Vector2(0.2, 0),
      cameraAzimuth: 0,
      verticalSpan: 20,
      aspect: 1,
      zoom: 1,
      deltaSeconds: 1 / 60,
      roomCenter: new THREE.Vector2(),
      roomBounds: new THREE.Vector2(8, 8),
    };
    let desktop = cameraFollowStep(initial, { ...baseFrame, compact: false });
    let compact = cameraFollowStep(initial, { ...baseFrame, compact: true });
    for (let frame = 1; frame < 90; frame += 1) {
      desktop = cameraFollowStep(desktop, { ...baseFrame, compact: false });
      compact = cameraFollowStep(compact, { ...baseFrame, compact: true });
    }

    expect(compact.deadZone.x).toBeLessThan(desktop.deadZone.x);
    expect(compact.center.x).toBeGreaterThan(desktop.center.x);
    expect(baseFrame.player.x - compact.center.x).toBeLessThanOrEqual(compact.deadZone.x + 0.01);
  });

  it("keeps manual look-around temporary and clamps the composed target to room bounds", () => {
    const previous = {
      center: new THREE.Vector2(4.8, 0),
      lookAhead: new THREE.Vector2(),
      manualOffset: new THREE.Vector2(4, 0),
      manualIdleSeconds: 0,
    };
    const frame = {
      player: new THREE.Vector2(5, 0),
      movement: new THREE.Vector2(0.2, 0),
      cameraAzimuth: 0,
      verticalSpan: 20,
      aspect: 1,
      zoom: 1,
      compact: false,
      deltaSeconds: 0.1,
      roomCenter: new THREE.Vector2(),
      roomBounds: new THREE.Vector2(5, 5),
    };

    const next = cameraFollowStep(previous, frame);

    expect(next.manualOffset.x).toBeLessThan(previous.manualOffset.x);
    expect(next.lookAhead.x).toBeGreaterThan(0);
    expect(next.target.x).toBe(5);
  });

  it("contains every randomized crawl tile in the logical-room camera envelope", () => {
    let authoredRoomMissesGeneratedTile = false;
    for (let seed = 1; seed <= 24; seed += 1) {
      const dungeon = generateSoulwellDungeon(seed);
      const tiles = dungeon.tiles.filter((tile) => tile.roomId === "skirmish");
      const envelope = cameraTileEnvelope(tiles, 1.75);
      const minimum = envelope.center.clone().sub(envelope.bounds);
      const maximum = envelope.center.clone().add(envelope.bounds);
      for (const tile of tiles) {
        const world = new THREE.Vector2(tile.x * 1.75, tile.y * 1.75);
        expect(world.x).toBeGreaterThanOrEqual(minimum.x);
        expect(world.x).toBeLessThanOrEqual(maximum.x);
        expect(world.y).toBeGreaterThanOrEqual(minimum.y);
        expect(world.y).toBeLessThanOrEqual(maximum.y);
      }
      const authored = dungeon.rooms.find((room) => room.id === "skirmish")!;
      const authoredMinimumX = (authored.center.x - authored.width * 0.5) * 1.75;
      const authoredMaximumX = (authored.center.x + authored.width * 0.5) * 1.75;
      authoredRoomMissesGeneratedTile ||= tiles.some((tile) => tile.x * 1.75 < authoredMinimumX || tile.x * 1.75 > authoredMaximumX);
    }
    expect(authoredRoomMissesGeneratedTile).toBe(true);
  });

  it("prioritizes a semantic target over an earlier floor hit", () => {
    const hits = [
      {},
      { tile: { x: 22, y: 2 } },
      { enemyId: "breachling-1" },
    ];

    expect(resolvePointerHitIntent(hits)).toEqual({ kind: "enemy", id: "breachling-1" });
    expect(resolvePointerHitIntent([{ tile: { x: 22, y: 2 } }])).toEqual({
      kind: "ground",
      tile: { x: 22, y: 2 },
    });
  });

  it("samples both lower and upper body for camera occlusion", () => {
    expect(occlusionSampleHeights(0.92)).toEqual([0.28, 0.92]);
    expect(occlusionSampleHeights(0.78)).toEqual([0.28, 0.78]);
  });
});
