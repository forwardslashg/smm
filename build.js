import esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';

async function runBuild() {
    try {
        // Create dist directory if it doesn't exist
        mkdirSync('./dist', { recursive: true });

        // Read metadata
        const meta = readFileSync('meta.txt', 'utf-8');

        // Build with esbuild
        await esbuild.build({
            entryPoints: ['./src/index.js'],
            bundle: true,
            format: 'iife',
            outfile: './dist/bundle.js',
            minify: false,
            target: 'es2020',
        });

        // Read the bundled output
        const bundle = readFileSync('./dist/bundle.js', 'utf-8');

        // Combine metadata with bundle
        const output = meta.trim() + '\n\n' + bundle;
        writeFileSync('./dist/modmenu.user.js', output, 'utf-8');

        // Clean up temporary bundle file
        try {
            unlinkSync('./dist/bundle.js');
        } catch (e) {}

        console.log('Build complete: dist/modmenu.user.js');
    } catch (err) {
        console.error('Build error:', err);
        process.exit(1);
    }
}

runBuild();
