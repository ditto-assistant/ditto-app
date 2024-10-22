import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            manifest: {
                name: 'Ditto App',
                short_name: 'Ditto',
                description: 'Hey Ditto!',
                theme_color: '#000000',
                icons: [
                    {
                        src: 'logo512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true
            },
        })
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    publicDir: 'public',
    server: {
        port: 3000
    },
    build: {
        outDir: 'build',
        sourcemap: false,
    },
    esbuild: {
        loader: 'tsx',
        include: /src\/.*\.[jt]sx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
                '.ts': 'tsx',
            },
        },
    },
});
