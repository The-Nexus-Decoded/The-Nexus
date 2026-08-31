import { TextureLoader } from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const configured = new WeakSet<GLTFLoader>();

export interface PinnedReviewAsset { readonly url: string; readonly bytes: number; readonly sha256: string }

/** One byte-verification path for source creatures and review props. New intakes
 * fail closed; only callers explicitly maintaining a legacy source can opt out.
 */
export async function fetchPinnedReviewAsset(asset: PinnedReviewAsset, options: {
  signal?: AbortSignal; baseURI?: string; requireChecksum?: boolean;
} = {}): Promise<{ bytes: ArrayBuffer; resourcePath: string; checksumVerified: boolean }> {
  if (!/^\/assets\/[\w./-]+$/.test(asset.url) || asset.url.split("/").includes("..")
    || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    throw new Error("Invalid pinned review asset receipt");
  }
  options.signal?.throwIfAborted();
  const subtle = globalThis.crypto?.subtle;
  if (!subtle && options.requireChecksum !== false) throw new Error("Review assets require SHA-256 verification in a secure context");
  const resolved = new URL(`.${asset.url}`, options.baseURI ?? document.baseURI);
  const response = await fetch(resolved, { signal: options.signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`Review asset download failed: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  options.signal?.throwIfAborted();
  if (bytes.byteLength !== asset.bytes) throw new Error("Review asset changed; update its reviewed intake receipt first");
  if (subtle) {
    const digest = await subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
    options.signal?.throwIfAborted();
    if (hash !== asset.sha256) throw new Error("Review asset SHA-256 does not match its pinned export");
  }
  return { bytes, resourcePath: new URL(".", resolved).href, checksumVerified: !!subtle };
}

/**
 * Review assets use the browser's native image decoder. The in-app browser can
 * decode the original boss JPEG through Image, while the bitmap loader's
 * intermediate blob fetch fails. No image bytes, UVs or materials are changed.
 * Keep this per loader/parser, never a global createImageBitmap or fetch patch.
 * Compressed texture extensions retain their own specialized loaders.
 */
export function configureReviewAssetLoader<T extends GLTFLoader>(loader: T): T {
  if (configured.has(loader)) return loader;
  configured.add(loader);
  loader.register((parser) => {
    parser.textureLoader = new TextureLoader(parser.options.manager)
      .setCrossOrigin(parser.options.crossOrigin)
      .setRequestHeader(parser.options.requestHeader);
    return {
      name: "SOULDRIFTER_REVIEW_NATIVE_IMAGES",
      async beforeRoot() {
        // GLTFLoader otherwise converts a failed texture into null and can
        // report a white, untextured actor as successfully loaded.
        const textures = await parser.getDependencies("texture");
        if (textures.some((texture) => texture == null)) {
          throw new Error("Original review asset textures failed to load. Retry the asset; no untextured substitute is shown.");
        }
      },
    };
  });
  return loader;
}
