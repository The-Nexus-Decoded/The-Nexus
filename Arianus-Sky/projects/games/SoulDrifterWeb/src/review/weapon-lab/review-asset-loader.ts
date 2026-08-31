import { TextureLoader } from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const configured = new WeakSet<GLTFLoader>();

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
