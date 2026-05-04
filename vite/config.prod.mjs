import { defineConfig } from 'vite';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';


const phasermsg = () => {
    return {
        name: 'phasermsg',
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            const line = "---------------------------------------------------------";
            const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
            process.stdout.write(`${line}\n${msg}\n${line}\n`);
            
            process.stdout.write(`✨ Done ✨\n`);
        }
    }
}   

export default defineConfig({
    base: './',
    logLevel: 'warning',
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
        minify: 'oxc'
    },
    server: {
        port: 8080
    },
    plugins: [
        vitePluginBundleObfuscator(),
        phasermsg()
    ]
});
