import { cssStyles } from './styles.js';

const modules = [];
let fabEl = null;
let modalBackdrop = null;
let modalEl = null;
let activeTab = 'chat';
let fabCheckInterval = null;

export function registerModule(moduleDescriptor) {
    modules.push(moduleDescriptor);
}

function getModuleCategory(moduleId) {
    const chatIds = ['model-switcher', 'response-length', 'chat-manager', 'auto-regenerate', 'filter-bypass', 'model-enforcer'];
    const uiIds = ['no-bloat', 'chat-themes'];
    const utilityIds = ['message-checker', 'tab-cloaker'];
    const usageIds = ['usage-dashboard'];
    if (usageIds.includes(moduleId)) return 'usage';
    if (uiIds.includes(moduleId)) return 'ui';
    if (utilityIds.includes(moduleId)) return 'modules';
    if (chatIds.includes(moduleId)) return 'chat';
    return 'modules';
}

function ensureFabExists(api) {
    if (fabEl && document.body.contains(fabEl)) return;
    // If fabEl reference exists but element is gone, clear it
    if (fabEl && !document.body.contains(fabEl)) {
        fabEl = null;
    }
    if (fabEl) return;

    const fabState = GM_getValue('caiFabState', { position: { bottom: '20px', right: '20px' } });

    const fab = document.createElement('div');
    fab.classList.add('cai-fab');
    fab.id = 'cai-modmenu-fab';
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    fab.title = "Slash's Modmenu";
    fab.style.bottom = fabState.position.bottom;
    fab.style.right = fabState.position.right;
    fab.style.left = fabState.position.left || 'auto';
    fab.style.top = fabState.position.top || 'auto';

    // Prevent NoBloat from hiding the FAB
    fab.setAttribute('data-cai-protected', '1');

    document.body.appendChild(fab);
    fabEl = fab;

    fab.addEventListener('click', () => {
        if (modalBackdrop) {
            modalBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    // FAB Dragging
    let isDragging = false;
    let dragStartX, dragStartY;
    let fabStartX, fabStartY;
    let hasDragged = false;

    fab.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasDragged = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = fab.getBoundingClientRect();
        fabStartX = rect.left;
        fabStartY = rect.top;
        fab.style.transition = 'none';
        e.preventDefault();
    });

    const moveHandler = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
        const x = fabStartX + dx;
        const y = fabStartY + dy;
        fab.style.left = `${x}px`;
        fab.style.top = `${y}px`;
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    };

    const upHandler = () => {
        if (isDragging) {
            isDragging = false;
            fab.style.transition = '';
            const rect = fab.getBoundingClientRect();
            fabState.position = { bottom: 'auto', right: 'auto', top: `${rect.top}px`, left: `${rect.left}px` };
            GM_setValue('caiFabState', fabState);
        }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
}

export function createModmenu(api) {
    if (modalBackdrop) {
        // Already created modal, just ensure FAB exists
        ensureFabExists(api);
        return;
    }

    ensureFabExists(api);

    // Modal backdrop
    const backdrop = document.createElement('div');
    backdrop.classList.add('cai-modal-backdrop');
    backdrop.id = 'cai-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
    });

    // Modal
    const modal = document.createElement('div');
    modal.classList.add('cai-modal');
    modal.id = 'cai-modal';
    modal.addEventListener('click', (e) => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.classList.add('cai-modal-header');

    const title = document.createElement('h2');
    title.classList.add('cai-modal-title');
    title.textContent = "Slash's Modmenu";
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.classList.add('cai-modal-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Tabs
    const tabs = document.createElement('div');
    tabs.classList.add('cai-tabs');
    const tabDefs = [
        { id: 'modules', label: 'Modules' },
        { id: 'chat', label: 'Chat' },
        { id: 'ui', label: 'UI & Theme' },
        { id: 'usage', label: 'Usage' },
        { id: 'about', label: 'About' }
    ];
    const tabEls = {};
    const tabBodies = {};

    tabDefs.forEach(def => {
        const tabBtn = document.createElement('button');
        tabBtn.classList.add('cai-tab');
        tabBtn.textContent = def.label;
        tabBtn.dataset.tab = def.id;
        tabBtn.addEventListener('click', () => switchTab(def.id));
        tabs.appendChild(tabBtn);
        tabEls[def.id] = tabBtn;
    });
    modal.appendChild(tabs);

    // Body container
    const bodyContainer = document.createElement('div');
    bodyContainer.classList.add('cai-modal-body');
    modal.appendChild(bodyContainer);

    // Create tab bodies
    tabDefs.forEach(def => {
        const body = document.createElement('div');
        body.dataset.tabBody = def.id;
        body.style.display = def.id === activeTab ? 'block' : 'none';
        bodyContainer.appendChild(body);
        tabBodies[def.id] = body;
    });

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    modalBackdrop = backdrop;
    modalEl = modal;

    // Render modules into tabs
    modules.forEach(module => {
        const cat = getModuleCategory(module.id);
        const body = tabBodies[cat];
        if (!body) return;

        const card = document.createElement('div');
        card.classList.add('cai-module-box-modal');

        const headerRow = document.createElement('div');
        headerRow.classList.add('cai-module-header-modal');

        const titleWrap = document.createElement('div');
        const titleEl = document.createElement('div');
        titleEl.classList.add('cai-module-title-modal');
        titleEl.textContent = module.title;
        titleWrap.appendChild(titleEl);

        const authorEl = document.createElement('div');
        authorEl.classList.add('cai-module-author-modal');
        authorEl.textContent = 'by ' + module.author;
        titleWrap.appendChild(authorEl);
        headerRow.appendChild(titleWrap);

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.classList.add('cai-toggle-switch');
        toggle.checked = GM_getValue(module.id, module.defaultEnabled);
        headerRow.appendChild(toggle);
        card.appendChild(headerRow);

        const descEl = document.createElement('div');
        descEl.classList.add('cai-module-desc-modal');
        descEl.textContent = module.description;
        card.appendChild(descEl);

        const containerEl = document.createElement('div');
        containerEl.classList.add('cai-module-container');
        card.appendChild(containerEl);

        let cleanupFn = null;

        function runIfEnabled() {
            if (cleanupFn) { cleanupFn(); cleanupFn = null; }
            if (toggle.checked) {
                const result = module.code(api, containerEl);
                if (typeof result === 'function') cleanupFn = result;
            } else {
                containerEl.innerHTML = '';
            }
        }

        toggle.addEventListener('change', function() {
            GM_setValue(module.id, this.checked);
            runIfEnabled();
        });

        body.appendChild(card);
        runIfEnabled();
    });

    // About tab content
    const aboutBody = tabBodies['about'];
    if (aboutBody) {
        aboutBody.innerHTML = `
            <div style="text-align:center;padding:20px 0;">
                <div style="font-size:32px;margin-bottom:8px;">/</div>
                <div style="font-size:20px;font-weight:600;color:var(--cai-text-primary);margin-bottom:4px;">Slash's Modmenu</div>
                <div style="font-size:13px;color:var(--cai-accent-purple);margin-bottom:16px;">v6.0.0 &mdash; Beta Release</div>
                <div style="font-size:12px;color:var(--cai-text-secondary);line-height:1.6;max-width:360px;margin:0 auto 20px;">
                    A comprehensive mod menu for Character.AI featuring filter bypasses, UI customization, chat theming, quota monitoring, and more.
                </div>
                <a href="https://slash.gay/" target="_blank" style="display:inline-block;padding:8px 16px;background:rgba(187,134,252,0.15);border:1px solid rgba(187,134,252,0.3);border-radius:8px;color:var(--cai-accent-purple);text-decoration:none;font-size:13px;font-weight:500;transition:all 0.2s;">slash.gay</a>
            </div>
            <div style="border-top:1px solid var(--cai-border-glass);padding-top:16px;margin-top:16px;">
                <div style="font-size:11px;color:var(--cai-text-detail);text-align:center;line-height:1.8;">
                    Built with care by Slash<br>
                    Not affiliated with Character.AI<br>
                    Use at your own risk
                </div>
            </div>
        `;
    }

    function switchTab(tabId) {
        activeTab = tabId;
        Object.keys(tabEls).forEach(id => {
            tabEls[id].classList.toggle('active', id === tabId);
            tabBodies[id].style.display = id === tabId ? 'block' : 'none';
        });
    }

    switchTab(activeTab);

    function closeModal() {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Keyboard shortcut: Escape to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
            closeModal();
        }
    });

    // Periodic check to ensure FAB still exists in DOM
    if (fabCheckInterval) clearInterval(fabCheckInterval);
    fabCheckInterval = setInterval(() => {
        if (!document.body.contains(fabEl)) {
            fabEl = null;
            ensureFabExists(api);
        }
    }, 2000);
}
