import esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG = {
    stableNamespace: 'slash.gay',
    devNamespace: 'slash.gay.dev',
    stableBranch: 'main',
    devBranch: 'development',
    repoRawUrl: 'https://raw.githubusercontent.com/forwardslashg/smm',
    releaseBaseUrl: 'https://github.com/forwardslashg/smm/releases/download',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

function exec(cmd, opts = {}) {
    console.log(`> ${cmd}`);
    return execSync(cmd, { stdio: 'inherit', ...opts });
}

function execQuiet(cmd) {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readMeta() {
    const content = readFileSync('meta.txt', 'utf-8');
    const lines = [];
    const meta = {};
    for (const line of content.split('\n')) {
        const m = line.match(/\/\/ @([\w-]+)\s+(.*)/);
        if (m) {
            lines.push({ key: m[1], value: m[2].trim(), raw: line });
            meta[m[1]] = m[2].trim();
        } else {
            lines.push({ raw: line });
        }
    }
    return { content, lines, meta };
}

function updateMetaFile(updates, originalContent = null) {
    let content = originalContent || readFileSync('meta.txt', 'utf-8');
    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^(// @${escapeRegExp(key)}\\s+).*$`, 'gm');
        if (regex.test(content)) {
            content = content.replace(regex, `$1${value}`);
        }
    }
    writeFileSync('meta.txt', content, 'utf-8');
}

function isClean() {
    return execQuiet('git status --porcelain') === '';
}

function getCurrentBranch() {
    return execQuiet('git branch --show-current');
}

function cleanVersion(v) {
    return v.replace(/[-+].*$/, '');
}

function bumpVersion(version, type) {
    const v = cleanVersion(version);
    const parts = v.split('.').map(Number);
    if (type === 'major') return `${parts[0] + 1}.0.0`;
    if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
    if (type === 'patch') return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    return v;
}

function getNextDevVersion(baseVersion) {
    const clean = cleanVersion(baseVersion);
    try {
        const tags = execQuiet('git tag -l')
            .split('\n')
            .filter(Boolean);
        const prefix = `v${clean}-dev.`;
        const nums = tags
            .filter((t) => t.startsWith(prefix))
            .map((t) => parseInt(t.slice(prefix.length)))
            .filter((n) => !isNaN(n));
        return `${clean}-dev.${nums.length ? Math.max(...nums) + 1 : 0}`;
    } catch {
        return `${clean}-dev.0`;
    }
}

// ─── Build ───────────────────────────────────────────────────────────────────
async function buildUserscript(metaOverrides = {}, type = 'quick') {
    mkdirSync('./dist', { recursive: true });

    const { lines, meta } = readMeta();
    const effectiveMeta = { ...meta, ...metaOverrides };

    const out = ['// ==UserScript=='];
    for (const entry of lines) {
        if (entry.key) {
            const value = metaOverrides[entry.key] !== undefined ? metaOverrides[entry.key] : entry.value;
            out.push(`// @${entry.key} ${value}`);
        }
    }

    if (type === 'stable') {
        const base = `${CONFIG.releaseBaseUrl}/v${effectiveMeta.version}`;
        out.push(`// @downloadURL ${base}/modmenu.user.js`);
        out.push(`// @updateURL   ${base}/modmenu.meta.js`);
    } else if (type === 'dev') {
        const base = `${CONFIG.repoRawUrl}/${CONFIG.devBranch}/dist`;
        out.push(`// @downloadURL ${base}/modmenu.user.js`);
        out.push(`// @updateURL   ${base}/modmenu.meta.js`);
    }
    // private / quick: no auto-update URLs

    out.push('// ==/UserScript==');
    const metaBlock = out.join('\n');

    await esbuild.build({
        entryPoints: ['./src/index.js'],
        bundle: true,
        format: 'iife',
        outfile: './dist/bundle.js',
        minify: false,
        target: 'es2020',
    });

    const bundle = readFileSync('./dist/bundle.js', 'utf-8');
    writeFileSync('./dist/modmenu.meta.js', `${metaBlock}\n`, 'utf-8');
    writeFileSync('./dist/modmenu.user.js', `${metaBlock}\n\n${bundle}`, 'utf-8');

    try {
        unlinkSync('./dist/bundle.js');
    } catch {}

    console.log(`\nBuild complete: v${effectiveMeta.version} @ ${effectiveMeta.namespace}`);
}

// ─── Release Functions ───────────────────────────────────────────────────────
async function stableRelease() {
    console.log('\n=== Stable Release ===');
    const branch = getCurrentBranch();
    if (branch !== CONFIG.stableBranch) {
        console.error(
            `Error: Must be on ${CONFIG.stableBranch} for stable release. Currently on ${branch}.`
        );
        return;
    }
    if (!isClean()) {
        console.error('Error: Working tree is dirty. Commit or stash changes first.');
        return;
    }

    const { meta, content } = readMeta();
    console.log(`Current version: ${meta.version}`);
    console.log('1) patch');
    console.log('2) minor');
    console.log('3) major');
    console.log('4) custom');

    const choice = await ask('Bump type: ');
    let newVersion;
    if (choice === '1') newVersion = bumpVersion(meta.version, 'patch');
    else if (choice === '2') newVersion = bumpVersion(meta.version, 'minor');
    else if (choice === '3') newVersion = bumpVersion(meta.version, 'major');
    else if (choice === '4') newVersion = await ask('Version: ');
    else {
        console.log('Invalid choice.');
        return;
    }

    const msg =
        (await ask(`Commit message [release: v${newVersion}]: `)) || `release: v${newVersion}`;

    meta.version = newVersion;
    meta.namespace = CONFIG.stableNamespace;
    updateMetaFile(meta, content);
    await buildUserscript({}, 'stable');

    exec('git add -f dist/ meta.txt');
    exec(`git commit -m "${msg}"`);
    exec(`git tag v${newVersion}`);
    exec(`git push origin ${CONFIG.stableBranch}`);
    exec(`git push origin v${newVersion}`);

    console.log(`\nStable release v${newVersion} published!`);
}

async function devRelease() {
    console.log('\n=== Development Release ===');
    if (!isClean()) {
        console.error('Error: Working tree is dirty. Commit or stash changes first.');
        return;
    }

    const originalBranch = getCurrentBranch();
    const { meta, content } = readMeta();
    const baseVersion = cleanVersion(meta.version);
    const suggested = getNextDevVersion(baseVersion);

    console.log(`Base version: ${baseVersion}`);
    const version = (await ask(`Dev version [${suggested}]: `)) || suggested;
    const msg = (await ask(`Commit message [dev: v${version}]: `)) || `dev: v${version}`;

    meta.version = version;
    meta.namespace = CONFIG.devNamespace;
    updateMetaFile(meta, content);
    await buildUserscript({}, 'dev');

    // Stash dev changes, switch branch, apply, commit, push, switch back
    const stashFiles = ['meta.txt', 'dist/modmenu.meta.js', 'dist/modmenu.user.js'].filter((f) =>
        existsSync(f)
    );
    exec(`git stash push -m "dev-release" ${stashFiles.join(' ')}`);

    try {
        execQuiet(`git rev-parse --verify ${CONFIG.devBranch}`);
        exec(`git checkout ${CONFIG.devBranch}`);
    } catch {
        exec(`git checkout -b ${CONFIG.devBranch}`);
    }

    exec('git stash pop');
    exec('git add -f dist/ meta.txt');
    exec(`git commit -m "${msg}"`);
    exec(`git push origin ${CONFIG.devBranch}`);

    if (originalBranch !== CONFIG.devBranch) {
        exec(`git checkout ${originalBranch}`);
    }

    console.log(`\nDev release v${version} pushed to ${CONFIG.devBranch}!`);
}

async function privateRelease() {
    console.log('\n=== Private Development Release ===');
    const { meta } = readMeta();
    const privateVersion = `${meta.version}-private`;

    console.log(`Building ${privateVersion} without modifying meta.txt...`);
    await buildUserscript(
        { version: privateVersion, namespace: CONFIG.devNamespace },
        'private'
    );

    console.log('\nPrivate build complete. Not committed or pushed.');
}

async function quickBuild() {
    console.log('\n=== Quick Development Build ===');
    await buildUserscript({}, 'quick');
    console.log('\nBuild complete.');
}

// ─── Main Menu ─────────────────────────────────────────────────────────────────
async function main() {
    console.log(`
   ____  _            _     __  __           _                        
  / ___|| | __ _  ___| | __|  \\/  | __ _ ___| |_ _   _ _ __ ___  ___ 
  \\___ \\| |/ _\` |/ __| |/ /| |\\/| |/ _\` / __| __| | | | '__/ _ \/ __|
   ___) | | (_| | (__|   < | |  | | (_| \\__ \\ |_| |_| | | |  __/\\__ \\
  |____/|_|\\__,_|\\___|_|\\_\\|_|  |_|\\__,_|___/\\__|\\__,_|_|  \\___||___/
                                                                          
  `);
    console.log('[1] Stable release');
    console.log('[2] Development release');
    console.log('[3] Development (private) release');
    console.log('[4] Quick development build');
    console.log('[5] Exit');

    const choice = await ask('\nSelect: ');

    switch (choice.trim()) {
        case '1':
            await stableRelease();
            break;
        case '2':
            await devRelease();
            break;
        case '3':
            await privateRelease();
            break;
        case '4':
            await quickBuild();
            break;
        case '5':
            break;
        default:
            console.log('Invalid choice.');
    }

    rl.close();
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
