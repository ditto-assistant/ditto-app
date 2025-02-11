// import MillionLint from "@million/lint";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    // MillionLint.vite({
    //   enabled: true,
    // }),
    react(),
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
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              id.includes("@emotion") ||
              id.includes("scheduler") ||
              id.includes("object-assign") ||
              id.includes("framer-motion")
            ) {
              return "react-vendor";
            }
            if (id.includes("firebase")) return "firebase";
            if (id.includes("@tensorflow")) return "tensorflow";
            if (id.includes("@huggingface")) return "huggingface";
            if (id.includes("@mui")) return "mui";
            if (id.includes("ace-builds") || id.includes("react-ace"))
              return "ace";
            if (id.includes("workbox")) return "workbox";
            if (id.includes("react-icons")) return "icons";
            return "vendor"; // all other node_modules
          }
          if (id.includes("src/screens")) {
            return "screens";
          }
          if (id.includes("src/components")) {
            return "components";
          }
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
      "react-router-dom",
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
