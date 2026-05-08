import esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const rollingReleaseBaseUrl = 'https://github.com/forwardslashg/smm/releases/download/rolling';

async function runBuild() {
    try {
        // Create dist directory if it doesn't exist
        mkdirSync('./dist', { recursive: true });

        // Read metadata
        const metaLines = readFileSync('meta.txt', 'utf-8')
            .trim()
            .split('\n');
        const closingTagIndex = metaLines.findIndex((line) => line.trim() === '// ==/UserScript==');

        if (closingTagIndex === -1) {
            throw new Error('meta.txt is missing the closing userscript tag');
        }

        const metaWithoutClosingTag = metaLines
            .slice(0, closingTagIndex)
            .filter((line) => !line.startsWith('// @downloadURL') && !line.startsWith('// @updateURL'));

        const metaWithUpdateUrls = [
            ...metaWithoutClosingTag,
            `// @downloadURL ${rollingReleaseBaseUrl}/modmenu.user.js`,
            `// @updateURL ${rollingReleaseBaseUrl}/modmenu.meta.js`,
            '// ==/UserScript=='
        ].join('\n');

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

        // Write the metadata file used for auto-updates
        writeFileSync('./dist/modmenu.meta.js', `${metaWithUpdateUrls}\n`, 'utf-8');

        // Combine metadata with bundle
        const output = `${metaWithUpdateUrls}\n\n${bundle}`;
        writeFileSync('./dist/modmenu.user.js', output, 'utf-8');

        // Clean up temporary bundle file
        try {
            unlinkSync('./dist/bundle.js');
        } catch (e) {}

        console.log('Build complete: dist/modmenu.user.js and dist/modmenu.meta.js');
    } catch (err) {
        console.error('Build error:', err);
        process.exit(1);
    }
}

runBuild();
