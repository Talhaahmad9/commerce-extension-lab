import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/content.ts",
      name: "CommerceContentScript",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});