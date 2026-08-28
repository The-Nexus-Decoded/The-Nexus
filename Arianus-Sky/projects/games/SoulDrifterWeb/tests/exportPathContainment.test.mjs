import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertLexicallyInside,
  prepareContainedOutputParent,
} from "../scripts/project-output-safety.mjs";

describe("project output containment", () => {
  it("rejects project root, traversal, and Windows cross-drive outputs", () => {
    const root = "H:\\project";
    expect(() => assertLexicallyInside(root, root)).toThrow(/must stay inside/);
    expect(() => assertLexicallyInside(root, "H:\\outside")).toThrow(/must stay inside/);
    expect(() => assertLexicallyInside(root, "C:\\important-directory")).toThrow(/must stay inside/);
    expect(assertLexicallyInside(root, "H:\\project\\generated\\layout.json"))
      .toBe(path.resolve("H:\\project\\generated\\layout.json"));
  });

  it("rejects an existing parent redirected outside through a junction", async () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "bv2-output-root-"));
    const external = fs.mkdtempSync(path.join(os.tmpdir(), "bv2-output-external-"));
    const link = path.join(fixture, "redirected");
    try {
      fs.symlinkSync(external, link, "junction");
      await expect(prepareContainedOutputParent(fixture, path.join(link, "layout.json")))
        .rejects.toThrow(/must stay inside/);
    } finally {
      fs.rmSync(link, { force: true });
      fs.rmSync(fixture, { force: true, recursive: true });
      fs.rmSync(external, { force: true, recursive: true });
    }
  });
});
