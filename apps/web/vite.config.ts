import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const motionPkg = path.resolve(webRoot, "node_modules/motion");

export default defineConfig({
  optimizeDeps: {
    include: ["motion", "motion/react"],
  },
  plugins: [
    varlockVitePlugin({ ssrInjectMode: "auto-load" }),
    tailwindcss(),
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
  ],
  resolve: {
    alias: {
      motion: motionPkg,
      "motion/react": path.resolve(motionPkg, "dist/es/react.mjs"),
    },
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: true,
    fs: {
      allow: [path.resolve(webRoot, "../..")],
    },
    host: true,
    port: 3001,
    strictPort: true,
  },
});
