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
      // We'll handle registration ourselves for better control
      registerType: "prompt",
      injectRegister: false, // Don't auto-register
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
      // Use generateSW strategy (default)
      devOptions: {
        enabled: true,
        type: "module",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,json}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Don't skip waiting by default, we'll control this
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        navigateFallback: "/index.html",
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
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.url.includes("assets/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-assets",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "styles",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
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
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
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
