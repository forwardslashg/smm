import { build } from 'bun';
import { unlinkSync } from 'fs';

async function runBuild() {
    const meta = await Bun.file('meta.txt').text();

    const result = await build({
        entrypoints: ['./src/index.js'],
        target: 'browser',
        format: 'iife',
        outdir: './dist',
        naming: 'bundle.js',
        minify: false,
    });

    if (!result.success) {
        console.error('Build failed:');
        for (const log of result.logs) {
            console.error(log);
        }
        process.exit(1);
    }

    const bundle = await Bun.file('./dist/bundle.js').text();
    const output = meta.trim() + '\n\n' + bundle;
    await Bun.write('./dist/modmenu.user.js', output);

    try {
        unlinkSync('./dist/bundle.js');
    } catch (e) {}

    console.log('Build complete: dist/modmenu.user.js');
}

runBuild().catch(err => {
    console.error('Build error:', err);
    process.exit(1);
});
