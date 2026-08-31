import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist/client",
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        game: "index.html",
        weaponLab: "weapon-lab.html",
        assetReview: "asset-review.html",
      },
    },
  },
});
