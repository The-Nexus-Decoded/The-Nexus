import fs from "node:fs";
import path from "node:path";
import { Accessor, NodeIO } from "@gltf-transform/core";
import { Euler, Quaternion } from "three";

const TARGET_ANIMATIONS = new Map([
  ["Idle", 1],
  ["CombatIdle", 0.82],
]);

const TRACK_RECIPES = new Map([
  ["pelvis", {
    translation: ({ breath, weight }) => [0.004 * weight, 0.0045 * breath, 0],
    rotation: ({ breath, weight }) => [0.45 * breath, 0, 0.28 * weight],
    scale: ({ breath }) => [0.004 * breath, 0.003 * breath, 0.006 * breath],
  }],
  ["spine.001", {
    rotation: ({ breath, weight }) => [1.15 * breath, 0, 0.38 * weight],
    scale: ({ breath }) => [0.01 * breath, 0.008 * breath, 0.012 * breath],
  }],
  ["spine.002", {
    rotation: ({ breath, weight }) => [-0.72 * breath, 0, -0.5 * weight],
    scale: ({ breath }) => [0.014 * breath, 0.006 * breath, 0.016 * breath],
  }],
  ["neck", {
    rotation: ({ breath, weight }) => [-0.38 * breath, 0, 0.42 * weight],
  }],
  ["head", {
    rotation: ({ breath, weight }) => [0.22 * breath, 0, -0.3 * weight],
  }],
  ["front_upper.L", {
    rotation: ({ breath, weight }) => [-0.28 * breath + 0.34 * weight, 0, 0],
  }],
  ["front_upper.R", {
    rotation: ({ breath, weight }) => [-0.28 * breath - 0.34 * weight, 0, 0],
  }],
  ["front_lower.L", {
    rotation: ({ weight }) => [-0.2 * weight, 0, 0],
  }],
  ["front_lower.R", {
    rotation: ({ weight }) => [0.2 * weight, 0, 0],
  }],
  ["rear_thigh.L", {
    rotation: ({ breath, weight }) => [0.18 * breath - 0.27 * weight, 0, 0],
  }],
  ["rear_thigh.R", {
    rotation: ({ breath, weight }) => [0.18 * breath + 0.27 * weight, 0, 0],
  }],
  ["rear_shin.L", {
    rotation: ({ weight }) => [0.16 * weight, 0, 0],
  }],
  ["rear_shin.R", {
    rotation: ({ weight }) => [-0.16 * weight, 0, 0],
  }],
]);

const io = new NodeIO();
const inputPaths = process.argv.slice(2).map((inputPath) => path.resolve(inputPath));

if (inputPaths.length === 0) {
  throw new Error("Pass one or more Breachling GLB paths to revise in place.");
}

function firstElement(accessor) {
  const result = new Array(accessor.getElementSize());
  accessor.getElement(0, result);
  return result;
}

function createAccessor(document, type, values, name) {
  return document
    .createAccessor(name)
    .setType(type)
    .setArray(new Float32Array(values));
}

function sampleMotion(index, sampleCount, strength) {
  const phase = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
  return {
    breath: (0.5 - 0.5 * Math.cos(Math.PI * 2 * phase)) * strength,
    weight: Math.sin(Math.PI * 2 * phase) * strength,
  };
}

function applyTranslation(base, delta) {
  return base.map((value, index) => value + delta[index]);
}

function applyScale(base, delta) {
  return base.map((value, index) => value * (1 + delta[index]));
}

function applyRotation(base, deltaDegrees) {
  const toRadians = Math.PI / 180;
  const baseRotation = new Quaternion(...base).normalize();
  const motionRotation = new Quaternion().setFromEuler(new Euler(
    deltaDegrees[0] * toRadians,
    deltaDegrees[1] * toRadians,
    deltaDegrees[2] * toRadians,
    "XYZ",
  ));
  return baseRotation.multiply(motionRotation).normalize().toArray();
}

function reviseAnimation(document, animation, strength) {
  const channels = new Map();
  for (const channel of animation.listChannels()) {
    const nodeName = channel.getTargetNode()?.getName();
    if (!nodeName) continue;
    channels.set(`${nodeName}:${channel.getTargetPath()}`, channel);
  }

  const duration = Math.max(...animation.listSamplers().flatMap((sampler) => (
    Array.from(sampler.getInput().getArray())
  )));
  const sampleCount = Math.round(duration * 30);
  const referenceTimes = Array.from(
    { length: sampleCount },
    (_, index) => (index + 1) / 30,
  );
  const timeAccessor = createAccessor(
    document,
    Accessor.Type.SCALAR,
    referenceTimes,
    `${animation.getName()}_full_body_times`,
  );

  let revisedTracks = 0;
  for (const [nodeName, recipe] of TRACK_RECIPES) {
    for (const [targetPath, recipeFunction] of Object.entries(recipe)) {
      const channel = channels.get(`${nodeName}:${targetPath}`);
      if (!channel) {
        throw new Error(`${animation.getName()} has no ${nodeName} ${targetPath} channel.`);
      }

      const sampler = channel.getSampler();
      if (sampler.getInterpolation() === "CUBICSPLINE") {
        throw new Error(`${animation.getName()} ${nodeName} ${targetPath} uses unsupported CUBICSPLINE interpolation.`);
      }

      const base = firstElement(sampler.getOutput());
      const values = [];
      for (let index = 0; index < referenceTimes.length; index += 1) {
        const delta = recipeFunction(sampleMotion(index, referenceTimes.length, strength));
        const sample = targetPath === "rotation"
          ? applyRotation(base, delta)
          : targetPath === "translation"
            ? applyTranslation(base, delta)
            : applyScale(base, delta);
        values.push(...sample);
      }

      const outputType = targetPath === "rotation" ? Accessor.Type.VEC4 : Accessor.Type.VEC3;
      const outputAccessor = createAccessor(
        document,
        outputType,
        values,
        `${animation.getName()}_${nodeName}_${targetPath}`,
      );
      sampler.setInput(timeAccessor).setOutput(outputAccessor).setInterpolation("LINEAR");
      revisedTracks += 1;
    }
  }

  return { name: animation.getName(), sampleCount: referenceTimes.length, revisedTracks };
}

for (const inputPath of inputPaths) {
  const document = await io.read(inputPath);
  const animations = document.getRoot().listAnimations();
  const results = [];

  for (const [animationName, strength] of TARGET_ANIMATIONS) {
    const animation = animations.find((candidate) => candidate.getName() === animationName);
    if (!animation) throw new Error(`${path.basename(inputPath)} is missing ${animationName}.`);
    results.push(reviseAnimation(document, animation, strength));
  }

  const temporaryPath = `${inputPath}.revised.tmp`;
  const encoded = await io.writeBinary(document);
  fs.writeFileSync(temporaryPath, encoded);
  fs.renameSync(temporaryPath, inputPath);

  process.stdout.write(`${JSON.stringify({
    status: "revised",
    file: inputPath,
    bytes: encoded.byteLength,
    animations: results,
  })}\n`);
}
