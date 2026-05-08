const THEME_STORAGE_KEY = 'cai_chat_theme';

const PRESETS = {
    default: { name: 'Default', bg: '', bubbleUser: '', bubbleAi: '', textUser: '', textAi: '', font: '', fontSize: '', opacity: '', blur: '' },
    amoled: { name: 'AMOLED', bg: '#000000', bubbleUser: '#1a1a1a', bubbleAi: '#0d0d0d', textUser: '#ffffff', textAi: '#e0e0e0', font: '', fontSize: '14px', opacity: '0.95', blur: '0px' },
    midnight: { name: 'Midnight Blue', bg: '#0a0e27', bubbleUser: '#1a237e', bubbleAi: '#0d1b3e', textUser: '#c5cae9', textAi: '#9fa8da', font: '', fontSize: '14px', opacity: '0.92', blur: '4px' },
    paper: { name: 'Paper', bg: '#f5f0e8', bubbleUser: '#ffffff', bubbleAi: '#f0ebe3', textUser: '#2d2d2d', textAi: '#4a4a4a', font: 'Georgia, serif', fontSize: '15px', opacity: '0.98', blur: '0px' },
    cyberpunk: { name: 'Cyberpunk', bg: '#0d0221', bubbleUser: '#ff00ff20', bubbleAi: '#00ffff15', textUser: '#ff00ff', textAi: '#00ffff', font: 'monospace', fontSize: '13px', opacity: '0.9', blur: '2px' },
    ocean: { name: 'Ocean', bg: '#001e3c', bubbleUser: '#01579b', bubbleAi: '#002f6c', textUser: '#b3e5fc', textAi: '#81d4fa', font: '', fontSize: '14px', opacity: '0.9', blur: '6px' },
    rose: { name: 'Rose Gold', bg: '#1a0a0f', bubbleUser: '#5d1a3a', bubbleAi: '#3d1026', textUser: '#ffc1e3', textAi: '#f8bbd0', font: '', fontSize: '14px', opacity: '0.92', blur: '4px' },
    forest: { name: 'Forest', bg: '#0a1f0a', bubbleUser: '#1b5e20', bubbleAi: '#0d3b0d', textUser: '#c8e6c9', textAi: '#a5d6a7', font: '', fontSize: '14px', opacity: '0.9', blur: '4px' }
};

function getCurrentTheme() {
    return GM_getValue(THEME_STORAGE_KEY, {});
}

function saveTheme(theme) {
    GM_setValue(THEME_STORAGE_KEY, theme);
}

function generateThemeCSS(theme) {
    let css = '';

    if (theme.bg) {
        css += `
            body, #__next, [class*="bg-background"], [class*="bg-primary"], [class*="bg-surface"] { background: ${theme.bg} !important; }
            #chat-body { background: ${theme.bg} !important; }
        `;
    }
    if (theme.bgImage) {
        css += `
            body { background-image: url('${theme.bgImage}') !important; background-size: cover !important; background-position: center !important; background-attachment: fixed !important; }
        `;
    }

    if (theme.bubbleUser) {
        css += `
            .cai-theme-user { background: ${theme.bubbleUser} !important; }
            [class*="message"]:has(img) ~ [class*="message"], [class*="turn"]:nth-child(odd) [class*="bubble"] { background: ${theme.bubbleUser} !important; }
        `;
    }
    if (theme.bubbleAi) {
        css += `
            .cai-theme-ai { background: ${theme.bubbleAi} !important; }
            [class*="turn"]:nth-child(even) [class*="bubble"] { background: ${theme.bubbleAi} !important; }
        `;
    }
    if (theme.textUser) {
        css += `[class*="turn"]:nth-child(odd) [class*="message"] { color: ${theme.textUser} !important; }`;
    }
    if (theme.textAi) {
        css += `[class*="turn"]:nth-child(even) [class*="message"] { color: ${theme.textAi} !important; }`;
    }
    if (theme.font) {
        css += `body, [class*="font-sans"] { font-family: ${theme.font} !important; }`;
    }
    if (theme.fontSize) {
        css += `[class*="message"], textarea { font-size: ${theme.fontSize} !important; }`;
    }
    if (theme.opacity) {
        css += `#chat-body { opacity: ${theme.opacity} !important; }`;
    }
    if (theme.blur && theme.blur !== '0px') {
        css += `[class*="bg-surface"], [class*="bg-primary-foreground"] { backdrop-filter: blur(${theme.blur}) !important; }`;
    }

    return css;
}

function injectThemeCSS(theme) {
    let old = document.getElementById('cai-theme-css');
    if (old) old.remove();
    const css = generateThemeCSS(theme);
    if (!css) return;
    const style = document.createElement('style');
    style.id = 'cai-theme-css';
    style.textContent = css;
    document.head.appendChild(style);
}

export default {
    id: 'chat-themes',
    title: 'Chat Themes',
    description: 'Customize chat colors, backgrounds, fonts, and more',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';
        let current = getCurrentTheme();

        // Preset selector
        const presetRow = document.createElement('div');
        presetRow.style.marginBottom = '8px';
        const presetLabel = document.createElement('div');
        presetLabel.textContent = 'Preset';
        presetLabel.style.fontSize = '11px';
        presetLabel.style.color = 'var(--cai-text-secondary)';
        presetLabel.style.marginBottom = '2px';
        presetRow.appendChild(presetLabel);
        const presetSelect = document.createElement('select');
        presetSelect.classList.add('cai-select');
        Object.entries(PRESETS).forEach(([key, p]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = p.name;
            presetSelect.appendChild(opt);
        });
        const resetOpt = document.createElement('option');
        resetOpt.value = 'custom';
        resetOpt.textContent = 'Custom';
        presetSelect.appendChild(resetOpt);
        presetRow.appendChild(presetSelect);
        container.appendChild(presetRow);

        function createColorRow(label, key) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '4px';
            const lbl = document.createElement('span');
            lbl.textContent = label;
            lbl.style.fontSize = '11px';
            lbl.style.color = 'var(--cai-text-secondary)';
            const input = document.createElement('input');
            input.type = 'color';
            input.value = current[key] || '#ffffff';
            input.style.width = '28px';
            input.style.height = '20px';
            input.style.border = 'none';
            input.style.background = 'none';
            input.style.cursor = 'pointer';
            input.addEventListener('input', () => {
                current[key] = input.value;
                saveTheme(current);
                injectThemeCSS(current);
            });
            row.appendChild(lbl);
            row.appendChild(input);
            return { row, input };
        }

        const bgRow = createColorRow('Background', 'bg');
        container.appendChild(bgRow.row);

        const bubbleUserRow = createColorRow('User Bubble', 'bubbleUser');
        container.appendChild(bubbleUserRow.row);

        const bubbleAiRow = createColorRow('AI Bubble', 'bubbleAi');
        container.appendChild(bubbleAiRow.row);

        const textUserRow = createColorRow('User Text', 'textUser');
        container.appendChild(textUserRow.row);

        const textAiRow = createColorRow('AI Text', 'textAi');
        container.appendChild(textAiRow.row);

        // Background image
        const imgRow = document.createElement('div');
        imgRow.style.marginBottom = '6px';
        const imgLabel = document.createElement('div');
        imgLabel.textContent = 'Background Image URL';
        imgLabel.style.fontSize = '11px';
        imgLabel.style.color = 'var(--cai-text-secondary)';
        imgRow.appendChild(imgLabel);
        const imgInput = document.createElement('input');
        imgInput.classList.add('cai-input');
        imgInput.placeholder = 'https://...';
        imgInput.value = current.bgImage || '';
        imgInput.addEventListener('change', () => {
            current.bgImage = imgInput.value;
            saveTheme(current);
            injectThemeCSS(current);
        });
        imgRow.appendChild(imgInput);
        container.appendChild(imgRow);

        // Font
        const fontRow = document.createElement('div');
        fontRow.style.marginBottom = '6px';
        const fontLabel = document.createElement('div');
        fontLabel.textContent = 'Font Family';
        fontLabel.style.fontSize = '11px';
        fontLabel.style.color = 'var(--cai-text-secondary)';
        fontRow.appendChild(fontLabel);
        const fontInput = document.createElement('input');
        fontInput.classList.add('cai-input');
        fontInput.placeholder = 'e.g. Georgia, serif';
        fontInput.value = current.font || '';
        fontInput.addEventListener('change', () => {
            current.font = fontInput.value;
            saveTheme(current);
            injectThemeCSS(current);
        });
        fontRow.appendChild(fontInput);
        container.appendChild(fontRow);

        // Preset handler
        presetSelect.addEventListener('change', () => {
            const key = presetSelect.value;
            if (key === 'custom') return;
            current = { ...PRESETS[key] };
            delete current.name;
            saveTheme(current);
            injectThemeCSS(current);
            // Update inputs
            bgRow.input.value = current.bg || '#ffffff';
            bubbleUserRow.input.value = current.bubbleUser || '#ffffff';
            bubbleAiRow.input.value = current.bubbleAi || '#ffffff';
            textUserRow.input.value = current.textUser || '#ffffff';
            textAiRow.input.value = current.textAi || '#ffffff';
            imgInput.value = current.bgImage || '';
            fontInput.value = current.font || '';
        });

        // Reset
        const resetBtn = document.createElement('button');
        resetBtn.classList.add('cai-btn');
        resetBtn.textContent = 'Reset to Default';
        resetBtn.addEventListener('click', () => {
            current = {};
            saveTheme(current);
            injectThemeCSS(current);
            bgRow.input.value = '#ffffff';
            bubbleUserRow.input.value = '#ffffff';
            bubbleAiRow.input.value = '#ffffff';
            textUserRow.input.value = '#ffffff';
            textAiRow.input.value = '#ffffff';
            imgInput.value = '';
            fontInput.value = '';
            presetSelect.value = 'default';
        });
        container.appendChild(resetBtn);

        injectThemeCSS(current);

        return () => {
            const old = document.getElementById('cai-theme-css');
            if (old) old.remove();
        };
    }
};
