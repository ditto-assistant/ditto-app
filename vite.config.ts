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
      // We'll handle registration ourselves for better control
      registerType: "prompt",
      manifest: {
        name: "Ditto",
        short_name: "Ditto",
        description: "Hey Ditto!",
        theme_color: "#000000",
        icons: [
          {
            src: "icons/ditto-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/ditto-icon.png",
            sizes: "1024x1024",
            type: "image/png",
          },
        ],
      },
      strategies: "injectManifest",
      injectRegister: false, // Don't auto-register
      devOptions: {
        enabled: true,
        type: "module",
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Don't skip waiting by default, we'll control this
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        navigateFallbackDenylist: [/^\/api/], // Don't cache API responses
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-css",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
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
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("firebase")) return "firebase";
            if (id.includes("@mui")) {
              if (id.includes("@mui/material")) return "mui-material";
              if (id.includes("@mui/icons")) return "mui-icons";
              return "mui-other";
            }
            if (id.includes("ace-builds")) {
              if (id.includes("theme")) return "ace-themes";
              if (id.includes("mode")) return "ace-modes";
              if (id.includes("snippets")) return "ace-snippets";
              if (id.includes("react-ace")) return "react-ace";
              if (id.includes("ext-language_tools"))
                return "ace-ext-language_tools";
              if (id.includes("ext-searchbox")) return "ace-ext-searchbox";
              return "ace-core";
            }
            if (id.includes("react-ace")) return "react-ace";
            if (id.includes("react-icons")) return "icons";
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
      "react-router",
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
