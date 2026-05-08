export const cssStyles = `
    :root {
        --cai-bg-panel: rgba(25, 25, 30, 0.55);
        --cai-bg-card: rgba(255, 255, 255, 0.06);
        --cai-bg-input: rgba(0, 0, 0, 0.3);
        --cai-bg-btn: rgba(255, 255, 255, 0.08);
        --cai-bg-btn-hover: rgba(255, 255, 255, 0.15);
        --cai-border-glass: rgba(255, 255, 255, 0.08);
        --cai-border-input: rgba(255, 255, 255, 0.1);
        --cai-border-btn: rgba(255, 255, 255, 0.12);
        --cai-inner-highlight: rgba(255, 255, 255, 0.05);
        --cai-text-primary: rgba(255, 255, 255, 0.92);
        --cai-text-secondary: rgba(255, 255, 255, 0.6);
        --cai-text-detail: rgba(255, 255, 255, 0.45);
        --cai-accent-purple: #bb86fc;
        --cai-accent-pink: #e040fb;
        --cai-accent-green: #69f0ae;
        --cai-accent-red: #ff5252;
        --cai-accent-amber: #ffab40;
        --cai-blur-heavy: blur(40px) saturate(1.8) brightness(1.1);
        --cai-blur-light: blur(20px) saturate(1.5) brightness(1.05);
        --cai-radius-lg: 16px;
        --cai-radius-md: 12px;
        --cai-radius-sm: 8px;
        --cai-shadow-panel: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06);
        --cai-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        --cai-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    @keyframes cai-fade-in-up {
        from { opacity: 0; transform: translateY(20px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .cai-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.35);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: opacity 0.5s ease;
    }

    .cai-loading-text {
        color: #fff;
        font-size: 24px;
        text-shadow: 0 0 24px rgba(187, 134, 252, 0.5);
        animation: cai-pulse 1.5s ease-in-out infinite;
    }

    @keyframes cai-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .cai-modmenu {
        position: fixed;
        background: var(--cai-bg-panel);
        backdrop-filter: var(--cai-blur-heavy);
        -webkit-backdrop-filter: var(--cai-blur-heavy);
        border-radius: var(--cai-radius-lg);
        padding: 14px;
        z-index: 9999;
        box-shadow: var(--cai-shadow-panel);
        width: 320px;
        height: 580px;
        cursor: default;
        font-family: var(--cai-font);
        color: var(--cai-text-primary);
        overflow: hidden;
        border: 1px solid var(--cai-border-glass);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        animation: cai-fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .cai-modmenu::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        opacity: 0.05;
        border-radius: inherit;
    }

    .cai-modmenu::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 45%;
        z-index: 1;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%);
        border-radius: var(--cai-radius-lg) var(--cai-radius-lg) 0 0;
    }

    .cai-modmenu > * {
        position: relative;
        z-index: 2;
    }

    .cai-modmenu h3 {
        margin-top: 0;
        margin-bottom: 12px;
        cursor: move;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.2px;
        color: var(--cai-text-primary);
    }

    .cai-minimize-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        color: var(--cai-text-secondary);
        transition: var(--cai-transition);
        z-index: 3;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--cai-radius-sm);
    }

    .cai-minimize-button:hover {
        color: var(--cai-accent-purple);
        background: rgba(255,255,255,0.06);
    }

    .cai-module-list {
        max-height: 490px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.15) transparent;
    }

    .cai-module-list::-webkit-scrollbar {
        width: 4px;
    }

    .cai-module-list::-webkit-scrollbar-track {
        background: transparent;
    }

    .cai-module-list::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
    }

    .cai-module-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.25);
    }

    .cai-module-box {
        padding: 12px;
        margin: 8px 0;
        border-radius: var(--cai-radius-md);
        display: flex;
        flex-direction: column;
        background: var(--cai-bg-card);
        backdrop-filter: var(--cai-blur-light);
        -webkit-backdrop-filter: var(--cai-blur-light);
        border: 1px solid var(--cai-border-glass);
        box-shadow: inset 0 1px 0 var(--cai-inner-highlight), 0 2px 4px rgba(0,0,0,0.05);
        transition: var(--cai-transition);
    }

    .cai-module-box:hover {
        background: rgba(255,255,255,0.09);
        border-color: rgba(255,255,255,0.12);
    }

    .cai-module-title {
        font-size: 15px;
        margin-bottom: 6px;
        font-weight: 500;
        color: var(--cai-text-primary);
    }

    .cai-module-description {
        font-size: 13px;
        margin-bottom: 6px;
        color: var(--cai-text-secondary);
        line-height: 1.4;
    }

    .cai-module-details {
        font-size: 11px;
        color: var(--cai-text-detail);
        margin-bottom: 8px;
    }

    .cai-module-toggle {
        margin-top: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 8px;
        font-size: 13px;
        color: var(--cai-text-secondary);
    }

    .cai-module-toggle input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        width: 38px;
        height: 22px;
        background: rgba(255,255,255,0.1);
        border-radius: 11px;
        border: 1px solid rgba(255,255,255,0.12);
        transition: var(--cai-transition);
        position: relative;
        cursor: pointer;
        outline: none;
    }

    .cai-module-toggle input[type="checkbox"]::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255,255,255,0.5);
        top: 2px;
        left: 2px;
        transition: var(--cai-transition);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .cai-module-toggle input[type="checkbox"]:checked {
        background: rgba(187,134,252,0.35);
        border-color: var(--cai-accent-purple);
    }

    .cai-module-toggle input[type="checkbox"]:checked::after {
        background: var(--cai-accent-purple);
        left: 18px;
        box-shadow: 0 0 8px rgba(187,134,252,0.5);
    }

    .cai-reload-message {
        background: rgba(255,171,64,0.12);
        border: 1px solid rgba(255,171,64,0.25);
        color: var(--cai-accent-amber);
        padding: 10px 12px;
        margin-top: 12px;
        display: none;
        border-radius: var(--cai-radius-sm);
        font-size: 12px;
        font-weight: 500;
    }

    .cai-version {
        font-size: 12px;
        margin-top: 12px;
        color: var(--cai-text-detail);
    }

    .cai-module-list a {
        color: var(--cai-accent-purple);
        text-decoration: none;
        transition: var(--cai-transition);
    }

    .cai-module-list a:hover {
        color: var(--cai-accent-pink);
        text-decoration: underline;
    }

    .cai-select, .cai-input {
        background: var(--cai-bg-input);
        border: 1px solid var(--cai-border-input);
        color: var(--cai-text-primary);
        padding: 6px 8px;
        border-radius: var(--cai-radius-sm);
        font-size: 12px;
        margin-top: 4px;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
        transition: var(--cai-transition);
        outline: none;
    }

    .cai-select:focus, .cai-input:focus {
        border-color: var(--cai-accent-purple);
        box-shadow: 0 0 0 3px rgba(187,134,252,0.2);
    }

    .cai-select option {
        background: #1a1a1f;
        color: var(--cai-text-primary);
    }

    .cai-btn {
        background: var(--cai-bg-btn);
        border: 1px solid var(--cai-border-btn);
        color: var(--cai-text-primary);
        padding: 6px 10px;
        border-radius: var(--cai-radius-sm);
        cursor: pointer;
        font-size: 12px;
        margin-top: 6px;
        margin-right: 4px;
        font-family: inherit;
        transition: var(--cai-transition);
        outline: none;
        font-weight: 500;
    }

    .cai-btn:hover {
        background: var(--cai-bg-btn-hover);
        border-color: rgba(255,255,255,0.18);
    }

    .cai-btn:active {
        transform: scale(0.97);
    }

    .cai-btn:focus-visible {
        box-shadow: 0 0 0 3px rgba(187,134,252,0.2);
    }

    .cai-notification {
        position: fixed;
        bottom: 16px;
        right: 16px;
        padding: 14px 16px;
        background: rgba(220, 50, 50, 0.65);
        backdrop-filter: blur(20px) saturate(1.5);
        -webkit-backdrop-filter: blur(20px) saturate(1.5);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.12);
        z-index: 9999;
        width: 260px;
        border-radius: var(--cai-radius-md);
        transition: all 0.3s ease;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        font-family: var(--cai-font);
        font-size: 13px;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
    }

    .cai-notification:hover {
        background: rgba(220, 50, 50, 0.75);
    }

    .cai-fab {
        position: fixed;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--cai-bg-panel);
        backdrop-filter: var(--cai-blur-heavy);
        -webkit-backdrop-filter: var(--cai-blur-heavy);
        border: 1px solid var(--cai-border-glass);
        box-shadow: var(--cai-shadow-panel);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        color: var(--cai-text-primary);
        font-size: 20px;
        user-select: none;
    }

    .cai-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 8px 32px rgba(187,134,252,0.25), 0 2px 8px rgba(0,0,0,0.3);
        border-color: rgba(187,134,252,0.3);
    }

    .cai-fab:active {
        transform: scale(0.95);
    }

    .cai-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
    }

    .cai-modal-backdrop.active {
        opacity: 1;
        pointer-events: all;
    }

    .cai-modal {
        width: 580px;
        max-width: 92vw;
        height: 720px;
        max-height: 90vh;
        background: var(--cai-bg-panel);
        backdrop-filter: var(--cai-blur-heavy);
        -webkit-backdrop-filter: var(--cai-blur-heavy);
        border-radius: var(--cai-radius-lg);
        border: 1px solid var(--cai-border-glass);
        box-shadow: var(--cai-shadow-panel);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.92) translateY(20px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
    }

    .cai-modal-backdrop.active .cai-modal {
        transform: scale(1) translateY(0);
    }

    .cai-modal-header {
        padding: 14px 18px;
        border-bottom: 1px solid var(--cai-border-glass);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
    }

    .cai-modal-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--cai-text-primary);
        margin: 0;
    }

    .cai-modal-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--cai-border-glass);
        color: var(--cai-text-secondary);
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--cai-transition);
        line-height: 1;
    }

    .cai-modal-close:hover {
        background: rgba(255,255,255,0.12);
        color: var(--cai-accent-red);
        border-color: rgba(255,82,82,0.3);
    }

    .cai-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 14px 0;
        border-bottom: 1px solid var(--cai-border-glass);
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .cai-tabs::-webkit-scrollbar {
        display: none;
    }

    .cai-tab {
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 500;
        color: var(--cai-text-secondary);
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        transition: var(--cai-transition);
        border: none;
        background: none;
        white-space: nowrap;
        position: relative;
    }

    .cai-tab:hover {
        color: var(--cai-text-primary);
        background: rgba(255,255,255,0.04);
    }

    .cai-tab.active {
        color: var(--cai-accent-purple);
    }

    .cai-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 6px;
        right: 6px;
        height: 2px;
        background: var(--cai-accent-purple);
        border-radius: 2px;
    }

    .cai-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 18px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.15) transparent;
    }

    .cai-modal-body::-webkit-scrollbar {
        width: 5px;
    }

    .cai-modal-body::-webkit-scrollbar-track {
        background: transparent;
    }

    .cai-modal-body::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.12);
        border-radius: 3px;
    }

    .cai-modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.22);
    }

    .cai-section-header {
        font-size: 14px;
        font-weight: 600;
        color: var(--cai-text-primary);
        margin: 0 0 10px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--cai-border-glass);
    }

    .cai-setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        gap: 12px;
    }

    .cai-setting-label {
        font-size: 13px;
        color: var(--cai-text-secondary);
    }

    .cai-module-box-modal {
        padding: 14px;
        margin-bottom: 10px;
        border-radius: var(--cai-radius-md);
        background: var(--cai-bg-card);
        backdrop-filter: var(--cai-blur-light);
        -webkit-backdrop-filter: var(--cai-blur-light);
        border: 1px solid var(--cai-border-glass);
        box-shadow: inset 0 1px 0 var(--cai-inner-highlight), 0 2px 4px rgba(0,0,0,0.05);
        transition: var(--cai-transition);
    }

    .cai-module-box-modal:hover {
        background: rgba(255,255,255,0.09);
        border-color: rgba(255,255,255,0.12);
    }

    .cai-module-header-modal {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .cai-module-title-modal {
        font-size: 15px;
        font-weight: 500;
        color: var(--cai-text-primary);
    }

    .cai-module-desc-modal {
        font-size: 12px;
        color: var(--cai-text-secondary);
        margin-bottom: 10px;
        line-height: 1.4;
    }

    .cai-module-author-modal {
        font-size: 10px;
        color: var(--cai-text-detail);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .cai-toggle-switch {
        appearance: none;
        -webkit-appearance: none;
        width: 40px;
        height: 24px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        transition: var(--cai-transition);
        position: relative;
        cursor: pointer;
        outline: none;
        flex-shrink: 0;
    }

    .cai-toggle-switch::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.5);
        top: 2px;
        left: 2px;
        transition: var(--cai-transition);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .cai-toggle-switch:checked {
        background: rgba(187,134,252,0.35);
        border-color: var(--cai-accent-purple);
    }

    .cai-toggle-switch:checked::after {
        background: var(--cai-accent-purple);
        left: 18px;
        box-shadow: 0 0 8px rgba(187,134,252,0.5);
    }
`;
