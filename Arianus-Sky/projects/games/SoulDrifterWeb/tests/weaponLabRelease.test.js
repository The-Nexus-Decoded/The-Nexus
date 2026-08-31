import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import viteConfig from "../vite.config.ts";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const reviewPages = ["weapon-lab.html", "asset-review.html"];
const embeddedGame = "<main>Embedded SoulDrifter game</main>";
let worker;

beforeAll(async () => {
  const source = await readFile(resolve(projectRoot, "worker/static-sites-worker.js"), "utf8");
  expect(source).toContain("const EMBEDDED_GAME_HTML = null;");
  // Exercise the deployed worker variant, not the source's empty game marker.
  const built = source.replace("const EMBEDDED_GAME_HTML = null;", `const EMBEDDED_GAME_HTML = ${JSON.stringify(embeddedGame)};`)
    .replace("export default worker;", "return worker;");
  worker = new Function("crypto", built)(webcrypto);
});

function environment(status = 200) {
  return {
    BETA_PASSWORD: "review-test-password-not-deployed",
    SESSION_SECRET: "review-test-secret-not-deployed",
    ASSETS: {
      fetch: vi.fn(async (request) => new Response(`Asset:${new URL(request.url).pathname}`, {
        status,
        headers: { "content-type": "text/html", "cache-control": "public, max-age=3600" },
      })),
    },
  };
}

async function loginCookie(env) {
  const response = await worker.fetch(new Request("https://review.invalid/beta-login", {
    method: "POST",
    body: new URLSearchParams({ password: env.BETA_PASSWORD }),
  }), env);
  expect(response.status).toBe(303);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Test login did not return a session cookie.");
  return cookie;
}

describe("packaged weapon review release", () => {
  it.each(reviewPages)("keeps /%s behind the existing authentication gate", async (page) => {
    const env = environment();
    const response = await worker.fetch(new Request(`https://review.invalid/${page}`, {
      headers: { accept: "text/html" },
    }), env);
    expect(await response.text()).toContain("Beta password");
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it.each(reviewPages)("serves /%s as a private review page, not the embedded game", async (page) => {
    const env = environment();
    const cookie = await loginCookie(env);
    const response = await worker.fetch(new Request(`https://review.invalid/${page}?review=1`, {
      headers: { accept: "text/html", cookie },
    }), env);
    expect(await response.text()).toBe(`Asset:/${page}`);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
  });

  it.each(reviewPages)("does not hide a missing /%s behind the game fallback", async (page) => {
    const env = environment(404);
    const cookie = await loginCookie(env);
    const response = await worker.fetch(new Request(`https://review.invalid/${page}`, {
      headers: { accept: "text/html", cookie },
    }), env);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe(`Asset:/${page}`);
    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves the normal authenticated game entry", async () => {
    const env = environment();
    const cookie = await loginCookie(env);
    const response = await worker.fetch(new Request("https://review.invalid/play", {
      headers: { accept: "text/html", cookie },
    }), env);
    expect(await response.text()).toBe(embeddedGame);
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("builds the existing game and both review HTML entries", async () => {
    expect(viteConfig.build?.rollupOptions?.input).toEqual({
      game: "index.html",
      weaponLab: "weapon-lab.html",
      assetReview: "asset-review.html",
    });
    for (const page of reviewPages) {
      const html = await readFile(resolve(projectRoot, page), "utf8");
      expect(html).toMatch(/<script\s+type="module"\s+src="[^\"]+"/);
      expect(html).not.toMatch(/\/@fs\/|[A-Z]:[\\/]/);
    }
  });

  it("retains and byte-verifies every mapped review asset", async () => {
    const manifest = JSON.parse(await readFile(resolve(projectRoot, "scripts/runtime-asset-manifest.json"), "utf8"));
    const map = JSON.parse(await readFile(resolve(projectRoot, "docs/3d-ai-studio/issue-435-lab-asset-map.json"), "utf8"));
    expect(manifest.developmentOnlyGlobs ?? []).toEqual([]);
    expect(manifest.maxBytes).toBe(500_000_000);
    expect(map.assets).toHaveLength(24);
    for (const asset of map.assets) {
      expect(asset.url).toMatch(/^\/assets\//);
      expect(manifest.protectedPaths).toContain(asset.url.slice(1));
      const bytes = await readFile(resolve(projectRoot, "public", asset.url.slice(1)));
      expect(bytes.length).toBe(asset.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
  });
});
