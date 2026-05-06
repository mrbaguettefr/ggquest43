import { defineConfig } from 'vite';
import { tiledMapPlugin } from './plugins/tiled-map.mjs';

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('/node_modules/phaser/')) {
                        return 'phaser';
                    }
                }
            }
        },
    },
    server: {
        port: 8080
    },
    plugins: [
        tiledMapPlugin()
    ]
});
