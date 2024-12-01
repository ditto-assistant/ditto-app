import MillionLint from "@million/lint";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    MillionLint.vite({
      enabled: true,
    }),
    react(),
    TanStackRouterVite(),
    VitePWA({
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      manifest: {
        name: "Ditto",
        short_name: "Ditto",
        description: "Hey Ditto!",
        theme_color: "#000000",
        icons: [
          {
            src: "maskable_icon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  assetsInclude: ["**/*.png", "**/*.jpg", "**/*.svg"],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@assets": resolve(__dirname, "src/assets"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  publicDir: "public",
  server: {
    port: 3000,
  },
  build: {
    outDir: "build",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        worker: resolve(__dirname, "src/worker.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "worker"
            ? "worker.js"
            : "assets/[name]-[hash].js";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    loader: "tsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "ace-builds",
      "react-ace",
      "ace-builds/src-noconflict/mode-javascript",
      "ace-builds/src-noconflict/theme-monokai",
      "ace-builds/src-noconflict/ext-language_tools",
      "framer-motion",
    ],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".ts": "tsx",
      },
    },
  },
});
