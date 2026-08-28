import { lstat, mkdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep, win32 } from "node:path";

export function assertLexicallyInside(projectRoot, candidate, label = "Output") {
  const root = resolve(projectRoot);
  const output = resolve(candidate);
  const relativePath = relative(root, output);
  if (
    relativePath === ""
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
    || win32.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} must stay inside the SoulDrifterWeb project root.`);
  }
  return output;
}

async function nearestExistingAncestor(candidate) {
  let current = resolve(candidate);
  while (true) {
    try {
      await lstat(current);
      return current;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
}

export async function prepareContainedOutputParent(projectRoot, outputPath, label = "Output") {
  const root = await realpath(resolve(projectRoot));
  const output = assertLexicallyInside(root, outputPath, label);
  const parent = dirname(output);
  const ancestor = await nearestExistingAncestor(parent);
  const realAncestor = await realpath(ancestor);
  assertLexicallyInside(root, resolve(realAncestor, relative(ancestor, parent)), label);
  await mkdir(parent, { recursive: true });
  const realParent = await realpath(parent);
  assertLexicallyInside(root, realParent, label);
  try {
    const outputStat = await lstat(output);
    if (outputStat.isSymbolicLink()) {
      throw new Error(`${label} must not be a symbolic link or reparse point.`);
    }
    assertLexicallyInside(root, await realpath(output), label);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return output;
}
