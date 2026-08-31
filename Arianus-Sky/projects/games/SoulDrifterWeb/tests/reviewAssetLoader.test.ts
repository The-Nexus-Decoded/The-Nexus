import { LoadingManager, TextureLoader } from "three";
import { GLTFLoader, type GLTFParser } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureReviewAssetLoader, fetchPinnedReviewAsset } from "../src/review/weapon-lab/review-asset-loader";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("shared review image decoding", () => {
  it("configures each loader only once without changing other loader plugins", () => {
    const loader = new GLTFLoader();
    const other = () => ({ name: "EXISTING_COMPRESSED_TEXTURE_PLUGIN" });
    loader.register(other);
    const register = vi.spyOn(loader, "register");
    expect(configureReviewAssetLoader(loader)).toBe(loader);
    configureReviewAssetLoader(loader);
    expect(register).toHaveBeenCalledTimes(1);
    const options = { manager: new LoadingManager(), crossOrigin: "anonymous", requestHeader: { "X-Asset": "review" } };
    const parser = { options } as unknown as GLTFParser;
    const plugin = register.mock.calls[0]![0](parser);
    expect(plugin.name).toBe("SOULDRIFTER_REVIEW_NATIVE_IMAGES");
    expect(parser.textureLoader).toBeInstanceOf(TextureLoader);
    expect(parser.textureLoader.manager).toBe(options.manager);
    expect(parser.textureLoader.crossOrigin).toBe("anonymous");
    expect(parser.textureLoader.requestHeader).toBe(options.requestHeader);
    expect(plugin.loadTexture).toBeUndefined();
  });

  it("uses an independent native decoder for every actual parser", async () => {
    const loader = configureReviewAssetLoader(new GLTFLoader());
    const source = JSON.stringify({ asset: { version: "2.0" }, scenes: [{ nodes: [0] }], nodes: [{ name: "unchanged source" }], scene: 0 });
    const first = await loader.parseAsync(source, "");
    const second = await loader.parseAsync(source, "");
    expect(first.parser.textureLoader).toBeInstanceOf(TextureLoader);
    expect(second.parser.textureLoader).not.toBe(first.parser.textureLoader);
    expect(first.parser.json).toEqual(JSON.parse(source));
    expect(first.scene.children[0]!.name).toBe("unchanged_source");
  });

  it("rejects a failed original texture before creating an untextured actor", async () => {
    const loader = new GLTFLoader(), register = vi.spyOn(loader, "register");
    configureReviewAssetLoader(loader);
    const parser = { options: { manager: new LoadingManager(), crossOrigin: "anonymous", requestHeader: {} },
      getDependencies: vi.fn(async () => [null]) } as unknown as GLTFParser;
    const plugin = register.mock.calls[0]![0](parser);
    await expect(plugin.beforeRoot!()).rejects.toThrow(/Original review asset textures failed/);
    expect(parser.getDependencies).toHaveBeenCalledWith("texture");
  });
});

describe("shared pinned review downloads", () => {
  const asset = { url: "/assets/review/asset.glb", bytes: 3,
    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" };
  const options = { baseURI: "http://localhost/project/weapon-lab.html" };
  it("verifies exact bytes and preserves the project-relative path", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response("abc")); vi.stubGlobal("fetch", request);
    const value = await fetchPinnedReviewAsset(asset, options);
    expect(value.checksumVerified).toBe(true); expect(value.bytes.byteLength).toBe(3);
    expect(String(request.mock.calls[0]![0])).toBe("http://localhost/project/assets/review/asset.glb");
    expect(value.resourcePath).toBe("http://localhost/project/assets/review/");
  });
  it("rejects altered content, incorrect length, failed HTTP and unsafe receipts", async () => {
    vi.stubGlobal("fetch", async () => new Response("abd"));
    await expect(fetchPinnedReviewAsset(asset, options)).rejects.toThrow("SHA-256");
    vi.stubGlobal("fetch", async () => new Response("abcd"));
    await expect(fetchPinnedReviewAsset(asset, options)).rejects.toThrow("asset changed");
    vi.stubGlobal("fetch", async () => new Response("bad", { status: 503 }));
    await expect(fetchPinnedReviewAsset(asset, options)).rejects.toThrow("HTTP 503");
    for (const url of ["https://external.invalid/asset.glb", "/assets/../secret", "/assets/%2e%2e/secret"]) {
      await expect(fetchPinnedReviewAsset({ ...asset, url }, options)).rejects.toThrow("receipt");
    }
  });
  it("requires a digest unless explicitly retaining a legacy source, and honors cancellation", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response("abc")); vi.stubGlobal("fetch", request);
    vi.stubGlobal("crypto", undefined);
    await expect(fetchPinnedReviewAsset(asset, options)).rejects.toThrow("require SHA-256"); expect(request).not.toHaveBeenCalled();
    expect((await fetchPinnedReviewAsset(asset, { ...options, requireChecksum: false })).checksumVerified).toBe(false);
    const abort = new AbortController(); abort.abort(); request.mockClear();
    await expect(fetchPinnedReviewAsset(asset, { ...options, signal: abort.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(request).not.toHaveBeenCalled();
  });
});
