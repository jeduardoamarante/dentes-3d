import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "gh" ? "/dentes-3d/" : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
}));
