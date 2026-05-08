const NO_BLOAT_KEYS = {
    hideSidebar: 'cai_nb_hideSidebar',
    hideUpgradeBtn: 'cai_nb_hideUpgradeBtn',
    hideCaiBadge: 'cai_nb_hideCaiBadge',
    hideDisclaimer: 'cai_nb_hideDisclaimer',
    hideNavButtons: 'cai_nb_hideNavButtons',
    hideRecommended: 'cai_nb_hideRecommended',
    hideTryThese: 'cai_nb_hideTryThese',
    hideVoices: 'cai_nb_hideVoices',
    hideScenes: 'cai_nb_hideScenes',
    hideFooter: 'cai_nb_hideFooter',
    hideShare: 'cai_nb_hideShare',
    hideReport: 'cai_nb_hideReport',
    hideLikeDislike: 'cai_nb_hideLikeDislike',
    hideCharacterHeader: 'cai_nb_hideCharacterHeader',
    hideGreetingCarousel: 'cai_nb_hideGreetingCarousel'
};

function getSettings() {
    const s = {};
    Object.keys(NO_BLOAT_KEYS).forEach(k => {
        s[k] = GM_getValue(NO_BLOAT_KEYS[k], false);
    });
    return s;
}

// Never touch elements inside the modmenu or protected elements
function isProtected(el) {
    if (!el) return true;
    if (el.closest && el.closest('#cai-modal, #cai-modal-backdrop, #cai-modmenu-fab, .cai-modmenu, .cai-fab, .cai-modal')) return true;
    if (el.dataset && (el.dataset.caiProtected || el.dataset.caiHidden)) return false; // we can unhide our own
    return false;
}

function findButtonsByExactText(text) {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
        if (isProtected(btn)) return false;
        return btn.textContent?.trim() === text;
    });
}

function findElementByExactText(tag, text, parentLevels = 0) {
    const results = [];
    document.querySelectorAll(tag).forEach(el => {
        if (isProtected(el)) return;
        if (el.childNodes.length > 1) return; // only match if text is direct/simple
        if (el.textContent?.trim() === text) {
            let target = el;
            for (let i = 0; i < parentLevels; i++) {
                if (target.parentElement) target = target.parentElement;
            }
            if (!isProtected(target)) results.push(target);
        }
    });
    return results;
}

let injectedStyleEl = null;

function buildNoBloatCSS() {
    const s = getSettings();
    let css = '';

    // Only apply on non-chat pages for layout elements
    const isChatPage = location.pathname.includes('/chat/');

    if (s.hideSidebar) {
        css += `
            body > [role="complementary"],
            body > div > [role="complementary"],
            aside[role="complementary"] { display: none !important; }
        `;
    }

    if (s.hideUpgradeBtn) {
        // Very specific: button inside sidebar nav area with exact text
        css += `
            [role="complementary"] button,
            nav button,
            aside button {
                display: none !important;
            }
        `;
    }

    if (s.hideCaiBadge) {
        // Target small badges next to character names, not chat content
        css += `
            div[class*="rounded-2xl"]:not([class*="message"]):not([class*="chat"]) {
                display: none !important;
            }
        `;
    }

    if (s.hideDisclaimer && isChatPage) {
        css += `
            #chat-body ~ div,
            [class*="disclaimer"],
            [class*="ai-notice"] { display: none !important; }
        `;
    }

    if (s.hideNavButtons) {
        // Target nav buttons by their position in the sidebar, not by text
        css += `
            [role="complementary"] > div > button:first-child,
            [role="complementary"] nav > button { display: none !important; }
        `;
    }

    if (s.hideRecommended && !isChatPage) {
        css += `
            main > div > div:has(> h2),
            main section:has(h2) { display: none !important; }
        `;
    }

    if (s.hideTryThese && !isChatPage) {
        css += `
            main h2:has-text("Try these") + *,
            main div:has(> h2):has-text("Try these") { display: none !important; }
        `;
    }

    if (s.hideVoices && !isChatPage) {
        css += `
            main h2:has-text("Voices") + *,
            main div:has(> h2):has-text("Voices") { display: none !important; }
        `;
    }

    if (s.hideScenes && !isChatPage) {
        css += `
            main h2:has-text("Scenes") + *,
            main div:has(> h2):has-text("Scenes") { display: none !important; }
        `;
    }

    if (s.hideFooter) {
        css += `footer { display: none !important; }`;
    }

    if (s.hideShare) {
        css += `
            button[aria-label="Share"] { display: none !important; }
        `;
    }

    if (s.hideReport) {
        css += `
            button[aria-label="Report"] { display: none !important; }
        `;
    }

    if (s.hideLikeDislike) {
        css += `
            [role="radio"][aria-label="Like"],
            [role="radio"][aria-label="Dislike"] { display: none !important; }
        `;
    }

    if (s.hideCharacterHeader && isChatPage) {
        css += `
            #chat-body > div:first-child > div:first-child { display: none !important; }
        `;
    }

    if (s.hideGreetingCarousel && isChatPage) {
        css += `
            .swiper,
            .swiper-wrapper { display: none !important; }
        `;
    }

    return css;
}

function applyNoBloatCSS() {
    if (injectedStyleEl) {
        injectedStyleEl.remove();
        injectedStyleEl = null;
    }

    const css = buildNoBloatCSS();
    if (!css) return;

    injectedStyleEl = document.createElement('style');
    injectedStyleEl.id = 'cai-nobloat-css';
    injectedStyleEl.textContent = css;
    document.head.appendChild(injectedStyleEl);
}

// For elements that need JS-based hiding (more precise than CSS)
function applyNoBloatJS() {
    const s = getSettings();
    const isChatPage = location.pathname.includes('/chat/');

    // Only do JS-based hiding for elements we can't target reliably with CSS
    if (s.hideUpgradeBtn) {
        findButtonsByExactText('Upgrade to').forEach(btn => {
            if (!btn.dataset.caiNb) btn.dataset.caiNb = '1';
            btn.style.display = 'none';
        });
    } else {
        document.querySelectorAll('button[data-cai-nb="1"]').forEach(btn => {
            if (btn.textContent?.trim() === 'Upgrade to') {
                btn.style.display = '';
                delete btn.dataset.caiNb;
            }
        });
    }

    if (s.hideDisclaimer && isChatPage) {
        // Only target the specific disclaimer in the chat input area
        const chatBody = document.getElementById('chat-body');
        if (chatBody) {
            const parent = chatBody.parentElement;
            if (parent) {
                const siblings = parent.children;
                for (let i = 0; i < siblings.length; i++) {
                    const el = siblings[i];
                    if (el === chatBody) continue;
                    const txt = el.textContent || '';
                    if (txt.includes('This is A.I.') || txt.includes('not a real person')) {
                        if (!el.dataset.caiNb) el.dataset.caiNb = '1';
                        el.style.display = 'none';
                    }
                }
            }
        }
    } else {
        document.querySelectorAll('[data-cai-nb="1"]').forEach(el => {
            const txt = el.textContent || '';
            if (txt.includes('This is A.I.') || txt.includes('not a real person')) {
                el.style.display = '';
                delete el.dataset.caiNb;
            }
        });
    }

    if (s.hideCaiBadge && isChatPage) {
        // Target only small badge elements, not chat messages
        document.querySelectorAll('div, span').forEach(el => {
            if (isProtected(el)) return;
            if (el.children.length > 0) return; // must be leaf text node
            if (el.textContent?.trim() === 'c.ai') {
                const parent = el.parentElement;
                if (parent && !isProtected(parent)) {
                    if (!parent.dataset.caiNb) parent.dataset.caiNb = '1';
                    parent.style.display = 'none';
                }
            }
        });
    } else {
        document.querySelectorAll('[data-cai-nb="1"]').forEach(el => {
            if (el.querySelector && el.querySelector('*')?.textContent?.trim() === 'c.ai') {
                el.style.display = '';
                delete el.dataset.caiNb;
            }
        });
    }
}

let observer = null;
let debounceTimer = null;

function debouncedApply() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applyNoBloatCSS();
        applyNoBloatJS();
    }, 150);
}

function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
        // Only react if meaningful nodes were added/removed
        let shouldApply = false;
        for (const m of mutations) {
            if (m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
                shouldApply = true;
                break;
            }
        }
        if (shouldApply) debouncedApply();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

export default {
    id: 'no-bloat',
    title: 'NoBloat UI',
    description: 'Remove clutter, ads, and unnecessary UI elements',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const opts = [
            { key: 'hideSidebar', label: 'Hide Sidebar' },
            { key: 'hideUpgradeBtn', label: 'Hide Upgrade Button' },
            { key: 'hideCaiBadge', label: 'Hide "c.ai" Badge' },
            { key: 'hideDisclaimer', label: 'Hide AI Disclaimer' },
            { key: 'hideNavButtons', label: 'Hide Discover/Feed/Charms/Labs' },
            { key: 'hideRecommended', label: 'Hide Recommended Characters' },
            { key: 'hideTryThese', label: 'Hide "Try these" Section' },
            { key: 'hideVoices', label: 'Hide Voices Section' },
            { key: 'hideScenes', label: 'Hide Scenes Section' },
            { key: 'hideFooter', label: 'Hide Footer' },
            { key: 'hideShare', label: 'Hide Share Button' },
            { key: 'hideReport', label: 'Hide Report Button' },
            { key: 'hideLikeDislike', label: 'Hide Like/Dislike Buttons' },
            { key: 'hideCharacterHeader', label: 'Hide Character Header in Chat' },
            { key: 'hideGreetingCarousel', label: 'Hide Greeting Carousel' }
        ];

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '4px';
        container.appendChild(grid);

        opts.forEach(opt => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '4px';
            label.style.fontSize = '11px';
            label.style.color = 'var(--cai-text-secondary)';
            label.style.cursor = 'pointer';
            label.style.padding = '4px';
            label.style.borderRadius = '6px';
            label.style.background = 'rgba(255,255,255,0.02)';
            label.style.userSelect = 'none';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = GM_getValue(NO_BLOAT_KEYS[opt.key], false);
            cb.style.width = '14px';
            cb.style.height = '14px';

            cb.addEventListener('change', () => {
                GM_setValue(NO_BLOAT_KEYS[opt.key], cb.checked);
                applyNoBloatCSS();
                applyNoBloatJS();
            });

            label.appendChild(cb);
            label.appendChild(document.createTextNode(opt.label));
            grid.appendChild(label);
        });

        applyNoBloatCSS();
        applyNoBloatJS();
        startObserver();

        return () => {
            if (observer) { observer.disconnect(); observer = null; }
            if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
            if (injectedStyleEl) { injectedStyleEl.remove(); injectedStyleEl = null; }
            document.querySelectorAll('[data-cai-nb]').forEach(el => {
                el.style.display = '';
                delete el.dataset.caiNb;
            });
        };
    }
};
