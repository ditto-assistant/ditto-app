import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
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
                skipWaiting: true,
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
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
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') ||
                            id.includes('react-dom') ||
                            id.includes('react-router-dom') ||
                            id.includes('@emotion') ||
                            id.includes('scheduler') ||
                            id.includes('object-assign')) {
                            return 'react-vendor';
                        }
                        if (id.includes('firebase')) return 'firebase';
                        if (id.includes('@tensorflow')) return 'tensorflow';
                        if (id.includes('@paypal')) return 'paypal';
                        if (id.includes('@huggingface')) return 'huggingface';
                        if (id.includes('@mui')) return 'mui';
                        if (id.includes('ace-builds') || id.includes('react-ace')) return 'ace';
                        if (id.includes('workbox')) return 'workbox';
                        if (id.includes('react-icons')) return 'icons';
                        return 'vendor'; // all other node_modules
                    }
                    if (id.includes('src/screens')) {
                        return 'screens';
                    }
                    if (id.includes('src/components')) {
                        return 'components';
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1000,
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
        include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
    }
});
