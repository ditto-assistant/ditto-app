import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            injectRegister: false,
            strategies: 'injectManifest',
            srcDir: 'src',
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
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            },
            injectManifest: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
            }
        })
    ],
    define: {
        'process.env.VERSION': JSON.stringify(process.env.npm_package_version)
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'] // Add TypeScript extensions
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
        loader: 'tsx', // Change from 'jsx' to 'tsx'
        include: /src\/.*\.[jt]sx?$/, // Include TypeScript files
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
                '.ts': 'tsx', // Add TypeScript loader
            },
        },
    },
});
