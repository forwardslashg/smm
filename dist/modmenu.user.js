// ==UserScript==
// @name         Slash's Modmenu
// @namespace    slash.gay
// @version      5.0.0
// @description  A sleek C.AI modmenu powered by reverse-engineered API
// @author       Slash
// @match        https://*.character.ai/*
// @exclude      https://pay.character.ai/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://cdn.slash.gay/r/ModMenu-Logo.png
// @run-at       document-start
// ==/UserScript==

(() => {
  // src/constants.js
  var CONFIG = {
    WS_URL: "wss://neo.character.ai/ws/",
    NEO_BASE: "https://neo.character.ai",
    PLUS_BASE: "https://plus.character.ai",
    MULTIMODAL_BASE: "https://neo.character.ai/multimodal/api",
    FEED_BASE: "https://feed.api.character.ai",
    SUB_BASE: "https://subscription.api.character.ai",
    USER_BASE: "https://user.api.character.ai",
    TRPC_BASE: "https://character.ai/api/trpc",
    logLimit: 200,
    interceptEnabled: true,
    autoLogWS: true,
    autoLogHTTP: false
  };
  var FEATURE_LIMITS = {
    SWIPE: "swipe",
    FAST_FORWARD: "fast_forward",
    MEMO: "memo",
    VOICE_CALL: "voice_call",
    CHAT_IMAGE_ATTACHMENT: "chat_image_attachment",
    CHAT_TIME_SPENT_MIN: "chat_time_spent_min"
  };
  var MODEL_TYPES = {
    fast: "MODEL_TYPE_FAST",
    smart: "MODEL_TYPE_SMART",
    balanced: "MODEL_TYPE_BALANCED",
    family_friendly: "MODEL_TYPE_FAMILY_FRIENDLY",
    memory_optimized: "MODEL_TYPE_MEMORY_OPTIMIZED",
    multilingual: "MODEL_TYPE_MULTILINGUAL",
    dynamic: "MODEL_TYPE_DYNAMIC",
    thinking: "MODEL_TYPE_THINKING",
    romantic: "MODEL_TYPE_ROMANTIC",
    french: "MODEL_TYPE_FRENCH",
    chinese: "MODEL_TYPE_CHINESE",
    deep_synth: "MODEL_TYPE_DEEP_SYNTH",
    deep_synth_lite: "MODEL_TYPE_DEEP_SYNTH_LITE",
    expressive: "MODEL_TYPE_EXPRESSIVE"
  };
  var WS_COMMANDS = {
    CREATE_CHAT: "create_chat",
    CREATE_TURN: "create_turn",
    CREATE_GROUP_TURN: "smart_reply_v2",
    CREATE_AND_GENERATE_TURN: "create_and_generate_turn",
    GENERATE_TURN: "generate_turn",
    GENERATE_TURN_CANDIDATE: "generate_turn_candidate",
    GENERATE_GREETING: "generate_greeting",
    GENERATE_IN_CHAT_IMAGE: "generate_in_chat_image",
    REMOVE_TURN: "remove_turn",
    SET_TURN_PIN: "set_turn_pin",
    ABORT_GENERATION: "abort_generation",
    PING: "ping",
    EDIT_TURN_CANDIDATE: "edit_turn_candidate",
    MU_STATE_UPDATE: "state_update",
    UPDATE_PRIMARY_CANDIDATE: "update_primary_candidate"
  };
  var EVENT_TYPES = {
    ADD_TURN: "add_turn",
    UPDATE_TURN: "update_turn",
    CREATE_CHAT_RESPONSE: "create_chat_response",
    NEO_ERROR: "neo_error",
    FILTER_USER_INPUT: "filter_user_input",
    FILTER_USER_INPUT_SELF_HARM: "filter_user_input_self_harm",
    REMOVE_TURNS_RESPONSE: "remove_turns_response",
    REMOVE_TURN: "remove_turn",
    UPDATE_MU_ROOM_RESPONSE: "update_mu_room_response",
    DELETE_MU_ROOM: "delete_mu_room",
    MU_STATE_UPDATE: "state_update",
    UPDATE_SCENE_INSTANCE: "update_scene_instance",
    OK_RESPONSE: "ok",
    GENERATE_IN_CHAT_IMAGE: "generate_in_chat_image"
  };

  // src/state.js
  var STATE = {
    ws: null,
    authToken: null,
    userId: null,
    userName: null,
    currentChatId: null,
    currentCharacterId: null,
    logs: [],
    wsHistory: [],
    httpHistory: [],
    chatListeners: [],
    wsListeners: [],
    httpListeners: [],
    isMenuOpen: true,
    interceptedMessages: [],
    primaryCandidateMap: {},
    turns: [],
    featureLimits: {},
    availableModels: [],
    defaultModelType: null,
    charmBalance: 0,
    modelEnforcer: null
  };

  // src/utils.js
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  function now() {
    return new Date().toISOString();
  }
  function log(type, data) {
    const entry = { time: Date.now(), iso: now(), type, data };
    STATE.logs.push(entry);
    if (STATE.logs.length > CONFIG.logLimit)
      STATE.logs.shift();
    if (CONFIG.autoLogWS && (type === "WS_SEND" || type === "WS_RECV")) {
      STATE.wsHistory.push(entry);
      if (STATE.wsHistory.length > CONFIG.logLimit)
        STATE.wsHistory.shift();
    }
    if (CONFIG.autoLogHTTP && (type === "HTTP_REQ" || type === "HTTP_RES")) {
      STATE.httpHistory.push(entry);
      if (STATE.httpHistory.length > CONFIG.logLimit)
        STATE.httpHistory.shift();
    }
    STATE.wsListeners.forEach((cb) => {
      try {
        cb(type, data);
      } catch (e) {}
    });
    const style = type === "WS_SEND" ? "color:#0f0" : type === "WS_RECV" ? "color:#0af" : type === "ERROR" ? "color:#f00" : "color:#fa0";
    console.log(`%c[CAI-MOD] ${type}`, style, data);
  }
  function getAuthToken() {
    if (STATE.authToken)
      return STATE.authToken;
    const match = document.cookie.match(/token=([^;]+)/);
    if (match)
      return match[1];
    return null;
  }
  function getUserInfo() {
    return { userId: STATE.userId, userName: STATE.userName, authToken: STATE.authToken };
  }

  // src/hooks/index.js
  function hookFetch() {
    const originalFetch = window.fetch;
    window._caiOriginalFetch = originalFetch;
    window.fetch = async function(...args) {
      const url = args[0];
      const options = args[1] || {};
      if (CONFIG.interceptEnabled && typeof url === "string" && (url.includes("neo.character.ai") || url.includes("plus.character.ai") || url.includes("character.ai/api"))) {
        let auth = null;
        if (options.headers) {
          if (typeof options.headers.get === "function") {
            auth = options.headers.get("Authorization") || options.headers.get("authorization");
          } else {
            auth = options.headers.Authorization || options.headers.authorization;
          }
        }
        if (auth && auth.startsWith("Token ")) {
          STATE.authToken = auth.replace("Token ", "").trim();
        }
        log("HTTP_REQ", { url, method: options.method || "GET", body: options.body });
      }
      const response = await originalFetch(...args);
      if (CONFIG.interceptEnabled && typeof url === "string" && (url.includes("neo.character.ai") || url.includes("plus.character.ai"))) {
        try {
          const clone = response.clone();
          const text = await clone.text();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (e) {}
          if (json) {
            if (json.chat?.chat_id) {
              STATE.currentChatId = json.chat.chat_id;
            }
            if (json.metadata?.chat_id) {
              STATE.currentChatId = json.metadata.chat_id;
            }
            if (Array.isArray(json.chats) && json.chats[0]?.chat_id) {
              STATE.currentChatId = json.chats[0].chat_id;
            }
            if (json.user?.id) {
              STATE.userId = String(json.user.id);
              STATE.userName = json.user.username || json.user.name || STATE.userName;
            }
            log("HTTP_RES", { url, status: response.status, body: json });
          }
        } catch (e) {}
      }
      return response;
    };
    console.log("[CAI-MOD] Fetch hooked");
  }
  function hookXHR() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (header.toLowerCase() === "authorization" && value.startsWith("Token ")) {
        STATE.authToken = value.replace("Token ", "").trim();
      }
      return origSetHeader.call(this, header, value);
    };
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._caiUrl = url;
      this._caiMethod = method;
      return origOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(body) {
      if (CONFIG.interceptEnabled && this._caiUrl && (this._caiUrl.includes("neo.character.ai") || this._caiUrl.includes("plus.character.ai"))) {
        log("HTTP_REQ", { url: this._caiUrl, method: this._caiMethod, body });
      }
      return origSend.call(this, body);
    };
    console.log("[CAI-MOD] XHR hooked");
  }
  function hookWebSocket() {
    const OriginalWebSocket = window.WebSocket;
    window._caiOriginalWebSocket = OriginalWebSocket;
    window.WebSocket = function(url, protocols) {
      const ws = new OriginalWebSocket(url, protocols);
      if (url.includes("neo.character.ai")) {
        STATE.ws = ws;
        const origSend = ws.send.bind(ws);
        ws.send = function(data) {
          if (CONFIG.interceptEnabled) {
            let parsed = data;
            try {
              parsed = JSON.parse(data);
            } catch (e) {}
            log("WS_SEND", parsed);
          }
          return origSend(data);
        };
        ws.addEventListener("message", (e) => {
          if (CONFIG.interceptEnabled) {
            let parsed = e.data;
            try {
              parsed = JSON.parse(e.data);
            } catch (err) {}
            log("WS_RECV", parsed);
          }
        });
      }
      return ws;
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach((k) => {
      if (typeof OriginalWebSocket[k] !== "undefined") {
        window.WebSocket[k] = OriginalWebSocket[k];
      }
    });
    console.log("[CAI-MOD] WebSocket hooked");
  }

  // src/ui/styles.js
  var cssStyles = `
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

  // src/ui/modmenu.js
  var modules = [];
  var fabEl = null;
  var modalBackdrop = null;
  var modalEl = null;
  var activeTab = "chat";
  var fabCheckInterval = null;
  function registerModule(moduleDescriptor) {
    modules.push(moduleDescriptor);
  }
  function getModuleCategory(moduleId) {
    const chatIds = ["model-switcher", "response-length", "chat-manager", "auto-regenerate", "filter-bypass", "model-enforcer"];
    const uiIds = ["no-bloat", "chat-themes"];
    const utilityIds = ["message-checker", "tab-cloaker"];
    const usageIds = ["usage-dashboard"];
    if (usageIds.includes(moduleId))
      return "usage";
    if (uiIds.includes(moduleId))
      return "ui";
    if (utilityIds.includes(moduleId))
      return "modules";
    if (chatIds.includes(moduleId))
      return "chat";
    return "modules";
  }
  function ensureFabExists(api) {
    if (fabEl && document.body.contains(fabEl))
      return;
    if (fabEl && !document.body.contains(fabEl)) {
      fabEl = null;
    }
    if (fabEl)
      return;
    const fabState = GM_getValue("caiFabState", { position: { bottom: "20px", right: "20px" } });
    const fab = document.createElement("div");
    fab.classList.add("cai-fab");
    fab.id = "cai-modmenu-fab";
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    fab.title = "Slash's Modmenu";
    fab.style.bottom = fabState.position.bottom;
    fab.style.right = fabState.position.right;
    fab.style.left = fabState.position.left || "auto";
    fab.style.top = fabState.position.top || "auto";
    fab.setAttribute("data-cai-protected", "1");
    document.body.appendChild(fab);
    fabEl = fab;
    fab.addEventListener("click", () => {
      if (modalBackdrop) {
        modalBackdrop.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    });
    let isDragging = false;
    let dragStartX, dragStartY;
    let fabStartX, fabStartY;
    let hasDragged = false;
    fab.addEventListener("mousedown", (e) => {
      isDragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = fab.getBoundingClientRect();
      fabStartX = rect.left;
      fabStartY = rect.top;
      fab.style.transition = "none";
      e.preventDefault();
    });
    const moveHandler = (e) => {
      if (!isDragging)
        return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3)
        hasDragged = true;
      const x = fabStartX + dx;
      const y = fabStartY + dy;
      fab.style.left = `${x}px`;
      fab.style.top = `${y}px`;
      fab.style.right = "auto";
      fab.style.bottom = "auto";
    };
    const upHandler = () => {
      if (isDragging) {
        isDragging = false;
        fab.style.transition = "";
        const rect = fab.getBoundingClientRect();
        fabState.position = { bottom: "auto", right: "auto", top: `${rect.top}px`, left: `${rect.left}px` };
        GM_setValue("caiFabState", fabState);
      }
    };
    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseup", upHandler);
  }
  function createModmenu(api) {
    if (modalBackdrop) {
      ensureFabExists(api);
      return;
    }
    ensureFabExists(api);
    const backdrop = document.createElement("div");
    backdrop.classList.add("cai-modal-backdrop");
    backdrop.id = "cai-modal-backdrop";
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop)
        closeModal();
    });
    const modal = document.createElement("div");
    modal.classList.add("cai-modal");
    modal.id = "cai-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());
    const header = document.createElement("div");
    header.classList.add("cai-modal-header");
    const title = document.createElement("h2");
    title.classList.add("cai-modal-title");
    title.textContent = "Slash's Modmenu";
    header.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.classList.add("cai-modal-close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", closeModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    const tabs = document.createElement("div");
    tabs.classList.add("cai-tabs");
    const tabDefs = [
      { id: "modules", label: "Modules" },
      { id: "chat", label: "Chat" },
      { id: "ui", label: "UI & Theme" },
      { id: "usage", label: "Usage" },
      { id: "about", label: "About" }
    ];
    const tabEls = {};
    const tabBodies = {};
    tabDefs.forEach((def) => {
      const tabBtn = document.createElement("button");
      tabBtn.classList.add("cai-tab");
      tabBtn.textContent = def.label;
      tabBtn.dataset.tab = def.id;
      tabBtn.addEventListener("click", () => switchTab(def.id));
      tabs.appendChild(tabBtn);
      tabEls[def.id] = tabBtn;
    });
    modal.appendChild(tabs);
    const bodyContainer = document.createElement("div");
    bodyContainer.classList.add("cai-modal-body");
    modal.appendChild(bodyContainer);
    tabDefs.forEach((def) => {
      const body = document.createElement("div");
      body.dataset.tabBody = def.id;
      body.style.display = def.id === activeTab ? "block" : "none";
      bodyContainer.appendChild(body);
      tabBodies[def.id] = body;
    });
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    modalBackdrop = backdrop;
    modalEl = modal;
    modules.forEach((module) => {
      const cat = getModuleCategory(module.id);
      const body = tabBodies[cat];
      if (!body)
        return;
      const card = document.createElement("div");
      card.classList.add("cai-module-box-modal");
      const headerRow = document.createElement("div");
      headerRow.classList.add("cai-module-header-modal");
      const titleWrap = document.createElement("div");
      const titleEl = document.createElement("div");
      titleEl.classList.add("cai-module-title-modal");
      titleEl.textContent = module.title;
      titleWrap.appendChild(titleEl);
      const authorEl = document.createElement("div");
      authorEl.classList.add("cai-module-author-modal");
      authorEl.textContent = "by " + module.author;
      titleWrap.appendChild(authorEl);
      headerRow.appendChild(titleWrap);
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.classList.add("cai-toggle-switch");
      toggle.checked = GM_getValue(module.id, module.defaultEnabled);
      headerRow.appendChild(toggle);
      card.appendChild(headerRow);
      const descEl = document.createElement("div");
      descEl.classList.add("cai-module-desc-modal");
      descEl.textContent = module.description;
      card.appendChild(descEl);
      const containerEl = document.createElement("div");
      containerEl.classList.add("cai-module-container");
      card.appendChild(containerEl);
      let cleanupFn = null;
      function runIfEnabled() {
        if (cleanupFn) {
          cleanupFn();
          cleanupFn = null;
        }
        if (toggle.checked) {
          const result = module.code(api, containerEl);
          if (typeof result === "function")
            cleanupFn = result;
        } else {
          containerEl.innerHTML = "";
        }
      }
      toggle.addEventListener("change", function() {
        GM_setValue(module.id, this.checked);
        runIfEnabled();
      });
      body.appendChild(card);
      runIfEnabled();
    });
    const aboutBody = tabBodies["about"];
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
      Object.keys(tabEls).forEach((id) => {
        tabEls[id].classList.toggle("active", id === tabId);
        tabBodies[id].style.display = id === tabId ? "block" : "none";
      });
    }
    switchTab(activeTab);
    function closeModal() {
      modalBackdrop.classList.remove("active");
      document.body.style.overflow = "";
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalBackdrop.classList.contains("active")) {
        closeModal();
      }
    });
    if (fabCheckInterval)
      clearInterval(fabCheckInterval);
    fabCheckInterval = setInterval(() => {
      if (!document.body.contains(fabEl)) {
        fabEl = null;
        ensureFabExists(api);
      }
    }, 2000);
  }

  // src/api/chat.js
  function connectWebSocket() {
    if (STATE.ws && (STATE.ws.readyState === 1 || STATE.ws.readyState === 0)) {
      console.log("[CAI-MOD] WS already connected");
      return STATE.ws;
    }
    const ws = new WebSocket(CONFIG.WS_URL);
    STATE.ws = ws;
    ws.onopen = () => {
      log("WS_EVENT", { event: "open" });
    };
    ws.onmessage = (e) => {
      let data = e.data;
      try {
        data = JSON.parse(data);
      } catch (err) {}
      log("WS_RECV", data);
      if (data && data.turn) {
        if (data.command === "add_turn") {
          STATE.turns.unshift(data.turn);
          STATE.currentChatId = data.turn.turn_key?.chat_id;
        } else if (data.command === "update_turn") {
          const idx = STATE.turns.findIndex((t) => t.turn_key?.turn_id === data.turn.turn_key?.turn_id);
          if (idx >= 0)
            STATE.turns[idx] = { ...STATE.turns[idx], ...data.turn };
          else
            STATE.turns.unshift(data.turn);
        }
        if (data.turn.primary_candidate_id) {
          STATE.primaryCandidateMap[data.turn.turn_key?.turn_id] = data.turn.primary_candidate_id;
        }
      }
      STATE.chatListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e2) {}
      });
    };
    ws.onclose = () => {
      log("WS_EVENT", { event: "close" });
      STATE.ws = null;
    };
    ws.onerror = (err) => {
      log("WS_EVENT", { event: "error", error: err });
    };
    return ws;
  }
  function sendWSCommand(command, payload, requestId = null) {
    const ws = STATE.ws || connectWebSocket();
    const rid = requestId || generateUUID();
    const msg = {
      command,
      request_id: rid,
      payload,
      origin_id: "web-next"
    };
    const send = () => {
      log("WS_SEND", msg);
      ws.send(JSON.stringify(msg));
    };
    if (ws.readyState === 1) {
      send();
    } else {
      ws.onopen = send;
    }
    return rid;
  }
  function sendMessage(text, options = {}) {
    const chatId = options.chatId || STATE.currentChatId || generateUUID();
    const characterId = options.characterId || STATE.currentCharacterId;
    const turnId = options.turnId || generateUUID();
    const candidateId = options.candidateId || generateUUID();
    const userName = options.userName || STATE.userName || "User";
    const userId = options.userId || STATE.userId || "0";
    if (!characterId) {
      console.error("[CAI-MOD] No character_id set. Use options.characterId or setCurrentCharacter()");
      return null;
    }
    const payload = {
      chat_type: options.chatType || "TYPE_ONE_ON_ONE",
      num_candidates: options.numCandidates || 1,
      tts_enabled: options.ttsEnabled || false,
      selected_language: options.language || "",
      character_id: characterId,
      user_name: userName,
      turn: {
        turn_key: { turn_id: turnId, chat_id: chatId },
        author: { author_id: userId, is_human: true, name: userName },
        candidates: [{ candidate_id: candidateId, raw_content: text }],
        primary_candidate_id: candidateId
      },
      previous_annotations: options.previousAnnotations || {
        boring: 0,
        not_boring: 0,
        inaccurate: 0,
        not_inaccurate: 0,
        repetitive: 0,
        not_repetitive: 0,
        out_of_character: 0,
        not_out_of_character: 0,
        bad_memory: 0,
        not_bad_memory: 0,
        long: 0,
        not_long: 0,
        short: 0,
        not_short: 0,
        ends_chat_early: 0,
        not_ends_chat_early: 0,
        funny: 0,
        not_funny: 0,
        interesting: 0,
        not_interesting: 0,
        helpful: 0,
        not_helpful: 0
      },
      generate_comparison: options.generateComparison || false
    };
    return sendWSCommand(WS_COMMANDS.CREATE_AND_GENERATE_TURN, payload);
  }
  function regenerateMessage(turnId, options = {}) {
    const chatId = options.chatId || STATE.currentChatId;
    const characterId = options.characterId || STATE.currentCharacterId;
    if (!chatId || !characterId) {
      console.error("[CAI-MOD] chatId and characterId required for regenerate");
      return null;
    }
    const payload = {
      character_id: characterId,
      turn_key: { turn_id: turnId, chat_id: chatId }
    };
    return sendWSCommand(WS_COMMANDS.GENERATE_TURN_CANDIDATE, payload);
  }
  function editTurnCandidate(turnId, candidateId, newText, options = {}) {
    const chatId = options.chatId || STATE.currentChatId;
    if (!chatId) {
      console.error("[CAI-MOD] chatId required");
      return null;
    }
    const payload = {
      turn_key: { turn_id: turnId, chat_id: chatId },
      new_candidate_raw_content: newText,
      candidate_id: candidateId
    };
    return sendWSCommand(WS_COMMANDS.EDIT_TURN_CANDIDATE, payload);
  }
  function removeTurn(turnId, options = {}) {
    const chatId = options.chatId || STATE.currentChatId;
    if (!chatId) {
      console.error("[CAI-MOD] chatId required");
      return null;
    }
    const payload = {
      turn_key: { turn_id: turnId, chat_id: chatId }
    };
    return sendWSCommand(WS_COMMANDS.REMOVE_TURN, payload);
  }
  function abortGeneration(requestId) {
    return sendWSCommand(WS_COMMANDS.ABORT_GENERATION, {}, requestId);
  }
  function ping() {
    return sendWSCommand(WS_COMMANDS.PING, {});
  }
  function createChat(characterId, options = {}) {
    const payload = {
      character_id: characterId,
      chat_type: options.chatType || "TYPE_ONE_ON_ONE"
    };
    return sendWSCommand(WS_COMMANDS.CREATE_CHAT, payload);
  }

  // src/api/client.js
  async function neoRequest(method, endpoint, body = null, extraHeaders = {}) {
    const headers = {
      Authorization: `Token ${STATE.authToken || getAuthToken() || ""}`,
      "Content-Type": "application/json",
      "Origin-ID": "web-next",
      ...extraHeaders
    };
    const opts = { method, headers, credentials: "include" };
    if (body)
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    const url = `${CONFIG.NEO_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    log("HTTP_REQ", { method, url, body });
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    log("HTTP_RES", { status: res.status, url, body: json || text });
    return { status: res.status, data: json, text };
  }
  async function plusRequest(method, endpoint, body = null) {
    const headers = {
      Authorization: `Token ${STATE.authToken || getAuthToken() || ""}`,
      "Content-Type": "application/json"
    };
    const opts = { method, headers, credentials: "include" };
    if (body)
      opts.body = JSON.stringify(body);
    const url = `${CONFIG.PLUS_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return { status: res.status, data: json, text };
  }

  // src/api/chat-data.js
  async function getChatInfo(chatId) {
    return neoRequest("GET", `/chat/${chatId}/?load_metadata=true`);
  }
  async function getTurns(chatId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return neoRequest("GET", `/turns/${chatId}/${qs ? "?" + qs : ""}`);
  }
  async function getRecentChats(characterId) {
    return neoRequest("GET", `/chats/recent/${encodeURIComponent(characterId)}`);
  }
  async function getRecentChatsGlobal() {
    return neoRequest("GET", "/chats/recent/");
  }
  async function updateChatModel(chatId, modelType) {
    return neoRequest("PATCH", `/chat/${chatId}/preferred-model-type`, { preferred_model_type: modelType });
  }
  async function updateChatResponseLength(chatId, length) {
    return neoRequest("PATCH", `/chat/${chatId}/update-response-length`, { response_length: length });
  }
  async function renameChat(chatId, name) {
    return neoRequest("PATCH", `/chat/${chatId}/update_name`, { name });
  }
  async function archiveChat(chatId) {
    return neoRequest("PATCH", `/chat/${chatId}/archive`);
  }
  async function unarchiveChat(chatId) {
    return neoRequest("PATCH", `/chat/${chatId}/unarchive`);
  }
  async function copyChat(chatId, endTurnId, overrides = {}) {
    return neoRequest("POST", `/chat/${chatId}/copy`, { end_turn_id: endTurnId, overrides });
  }
  async function deleteTurns(chatId, turnIds) {
    return neoRequest("POST", `/turns/${chatId}/remove`, { turn_ids: turnIds });
  }
  async function resurrectChat(chatId) {
    return neoRequest("GET", `/chat/${chatId}/resurrect`);
  }

  // src/api/character.js
  async function getCharacterInfo(characterId) {
    return neoRequest("POST", "/character/v1/get_character_info", { external_id: characterId });
  }
  async function getCharacterInfos(characterIds) {
    return neoRequest("POST", "/character/v1/get_character_infos", { external_ids: characterIds });
  }
  async function searchCharacters(query, options = {}) {
    const params = new URLSearchParams;
    params.append("query", query);
    if (options.tagId)
      params.append("tagId", options.tagId);
    if (options.sortedBy)
      params.append("sortedBy", options.sortedBy);
    if (options.cursor)
      params.append("cursor", options.cursor);
    return neoRequest("GET", `/search/v1/character?${params.toString()}`);
  }
  async function voteCharacter(characterId, vote) {
    return neoRequest("POST", "/character/v1/vote_character", { external_id: characterId, vote });
  }
  async function hideCharacter(characterId) {
    return plusRequest("POST", "/chat/character/hide/", { external_id: characterId });
  }
  async function getVoiceOverride(characterId) {
    return plusRequest("GET", `/chat/character/${characterId}/voice_override/`);
  }
  async function checkVoted(characterId) {
    return neoRequest("GET", `/character/v1/character_voted/${characterId}/voted`);
  }

  // src/api/user.js
  async function getUserSettings() {
    return plusRequest("GET", "/chat/user/settings/");
  }
  async function getUser() {
    return neoRequest("GET", "/user/");
  }
  async function getUserPersonas(forceRefresh = false) {
    return neoRequest("GET", `/character/v1/get_user_personas?force_refresh=${forceRefresh ? 1 : 0}`);
  }

  // src/api/image.js
  async function generateImage(prompt2, options = {}) {
    return neoRequest("POST", "/multimodal/api/v1/media/generation/generateImage", { prompt: prompt2, ...options });
  }
  async function imagineChat(chatId, prompt2) {
    return neoRequest("POST", "/image/in_chat_imagine", { chat_id: chatId, prompt: prompt2 });
  }

  // src/api/feature-limits.js
  async function getFeatureLimit(feature) {
    return neoRequest("GET", `/feature_limits/${feature}`);
  }
  async function consumeFeatureLimit(feature, count = 1) {
    return neoRequest("POST", `/feature_limits/${feature}/consume`, { count });
  }
  async function getAvailableModels() {
    return neoRequest("GET", "/get-available-models");
  }
  async function getTurnCount(chatMarkers) {
    return neoRequest("POST", "/turns/count", { chat_markers: chatMarkers });
  }
  async function getUsageQuota(functionName = "generate_turn", interval = "MONTH") {
    return neoRequest("GET", `/usage?function=${functionName}&intervals=${interval}`);
  }

  // src/api/subscription.js
  async function subRequest(method, endpoint, body = null) {
    const headers = {
      Authorization: `Token ${STATE.authToken || getAuthToken() || ""}`,
      "Content-Type": "application/json"
    };
    const opts = { method, headers, credentials: "include" };
    if (body)
      opts.body = JSON.stringify(body);
    const url = `${CONFIG.SUB_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return { status: res.status, data: json, text };
  }
  async function getProductPrices() {
    return subRequest("GET", "/v1/vc/product-prices");
  }
  async function getUserBalances(userId) {
    return subRequest("GET", `/v1/vc/users/${userId}/balances`);
  }
  async function getProductStatus(userId, productId) {
    return subRequest("GET", `/v1/vc/users/${userId}/products/${productId}/status`);
  }
  async function purchaseProduct(userId, productId, paymentMethod = "charm") {
    return subRequest("POST", `/v1/vc/users/${userId}/purchase`, { product_id: productId, payment_method: paymentMethod });
  }

  // src/ui/modules/model-switcher.js
  var model_switcher_default = {
    id: "model-switcher",
    title: "Model Switcher",
    description: "Switch between AI model types",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const select = document.createElement("select");
      select.classList.add("cai-select");
      Object.entries(MODEL_TYPES).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = key;
        select.appendChild(option);
      });
      container.appendChild(select);
      const btn = document.createElement("button");
      btn.classList.add("cai-btn");
      btn.textContent = "Set Model";
      container.appendChild(btn);
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginTop = "4px";
      status.style.color = "rgba(255,255,255,0.5)";
      container.appendChild(status);
      btn.addEventListener("click", async () => {
        if (!STATE.currentChatId) {
          status.textContent = "No chat detected. Open a chat first.";
          status.style.color = "#ff5252";
          return;
        }
        status.textContent = "Setting...";
        status.style.color = "rgba(255,255,255,0.6)";
        try {
          const res = await updateChatModel(STATE.currentChatId, select.value);
          if (res.status >= 200 && res.status < 300) {
            status.textContent = `Set to ${select.options[select.selectedIndex].text}`;
            status.style.color = "#69f0ae";
          } else {
            status.textContent = "Failed: " + (res.data?.message || res.status);
            status.style.color = "#ff5252";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "#ff5252";
        }
      });
    }
  };

  // src/ui/modules/response-length.js
  var response_length_default = {
    id: "response-length",
    title: "Response Length",
    description: "Adjust AI response length",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const select = document.createElement("select");
      select.classList.add("cai-select");
      const options = [
        { value: "SHORT", label: "Short" },
        { value: "MEDIUM", label: "Medium" },
        { value: "LONG", label: "Long" }
      ];
      options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });
      container.appendChild(select);
      const btn = document.createElement("button");
      btn.classList.add("cai-btn");
      btn.textContent = "Set Length";
      container.appendChild(btn);
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginTop = "4px";
      status.style.color = "rgba(255,255,255,0.5)";
      container.appendChild(status);
      btn.addEventListener("click", async () => {
        if (!STATE.currentChatId) {
          status.textContent = "No chat detected. Open a chat first.";
          status.style.color = "#ff5252";
          return;
        }
        status.textContent = "Setting...";
        status.style.color = "rgba(255,255,255,0.6)";
        try {
          const res = await updateChatResponseLength(STATE.currentChatId, select.value);
          if (res.status >= 200 && res.status < 300) {
            status.textContent = `Set to ${select.options[select.selectedIndex].text}`;
            status.style.color = "#69f0ae";
          } else {
            status.textContent = "Failed: " + (res.data?.message || res.status);
            status.style.color = "#ff5252";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "#ff5252";
        }
      });
    }
  };

  // src/ui/modules/chat-manager.js
  var chat_manager_default = {
    id: "chat-manager",
    title: "Chat Manager",
    description: "Archive, rename, copy, or resurrect chats",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginBottom = "4px";
      status.style.color = "rgba(255,255,255,0.5)";
      status.textContent = "Requires open chat";
      container.appendChild(status);
      const makeBtn = (label, action) => {
        const btn = document.createElement("button");
        btn.classList.add("cai-btn");
        btn.textContent = label;
        btn.addEventListener("click", async () => {
          if (!STATE.currentChatId) {
            status.textContent = "No chat detected. Open a chat first.";
            status.style.color = "#ff5252";
            return;
          }
          status.textContent = "Working...";
          status.style.color = "rgba(255,255,255,0.6)";
          try {
            const res = await action();
            if (res.status >= 200 && res.status < 300) {
              status.textContent = `${label} done`;
              status.style.color = "#69f0ae";
            } else {
              status.textContent = "Failed: " + (res.data?.message || res.status);
              status.style.color = "#ff5252";
            }
          } catch (e) {
            status.textContent = "Error: " + e.message;
            status.style.color = "#ff5252";
          }
        });
        return btn;
      };
      container.appendChild(makeBtn("Archive", () => archiveChat(STATE.currentChatId)));
      container.appendChild(makeBtn("Unarchive", () => unarchiveChat(STATE.currentChatId)));
      const renameBtn = document.createElement("button");
      renameBtn.classList.add("cai-btn");
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", async () => {
        if (!STATE.currentChatId) {
          status.textContent = "No chat detected. Open a chat first.";
          status.style.color = "#ff5252";
          return;
        }
        const name = prompt("New chat name:");
        if (!name)
          return;
        status.textContent = "Renaming...";
        status.style.color = "rgba(255,255,255,0.6)";
        try {
          const res = await renameChat(STATE.currentChatId, name);
          if (res.status >= 200 && res.status < 300) {
            status.textContent = "Renamed";
            status.style.color = "#69f0ae";
          } else {
            status.textContent = "Failed: " + (res.data?.message || res.status);
            status.style.color = "#ff5252";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "#ff5252";
        }
      });
      container.appendChild(renameBtn);
      container.appendChild(makeBtn("Resurrect", () => resurrectChat(STATE.currentChatId)));
      const copyBtn = document.createElement("button");
      copyBtn.classList.add("cai-btn");
      copyBtn.textContent = "Copy Chat";
      copyBtn.addEventListener("click", async () => {
        if (!STATE.currentChatId) {
          status.textContent = "No chat detected. Open a chat first.";
          status.style.color = "#ff5252";
          return;
        }
        const endTurnId = prompt("End turn ID (optional):") || undefined;
        status.textContent = "Copying...";
        status.style.color = "rgba(255,255,255,0.6)";
        try {
          const res = await copyChat(STATE.currentChatId, endTurnId);
          if (res.status >= 200 && res.status < 300) {
            status.textContent = "Copied. See console for new chat ID.";
            status.style.color = "#69f0ae";
            console.log("[CAI-MOD] Copy result:", res.data);
          } else {
            status.textContent = "Failed: " + (res.data?.message || res.status);
            status.style.color = "#ff5252";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "#ff5252";
        }
      });
      container.appendChild(copyBtn);
    }
  };

  // src/ui/modules/message-checker.js
  var message_checker_default = {
    id: "message-checker",
    title: "Message Checker",
    description: "Warns if your message contains filter-triggering words",
    author: "Slash",
    defaultEnabled: true,
    code(api, container) {
      const prohibitedWords = ["sex", "penis", "vagina", "cum", "lets fuck", "let's fuck", "wanna fuck", "horny", "intimate activites", "lets fck", "let's fck", "pussy", "breast", "boob"];
      let intervalId = setInterval(() => {
        if (!window.location.href.includes("/chat"))
          return;
        const textAreas = document.querySelectorAll("textarea");
        let found = false;
        let matchedWord = "";
        textAreas.forEach((userInput) => {
          const userMessage = userInput.value.toLowerCase();
          const match = prohibitedWords.find((word) => userMessage.includes(word));
          if (match) {
            found = true;
            matchedWord = match;
          }
        });
        let existingNotification = document.getElementById("cai-messageCheckerNotification");
        if (found) {
          if (!existingNotification) {
            const notification = document.createElement("div");
            notification.id = "cai-messageCheckerNotification";
            notification.classList.add("cai-notification");
            notification.textContent = `I wouldn't say that, as it may trigger the filter: ${matchedWord}`;
            document.body.appendChild(notification);
          } else {
            existingNotification.textContent = `I wouldn't say that, as it may trigger the filter: ${matchedWord}`;
          }
        } else if (existingNotification && existingNotification.parentNode === document.body) {
          document.body.removeChild(existingNotification);
        }
      }, 500);
      return () => {
        clearInterval(intervalId);
        const existingNotification = document.getElementById("cai-messageCheckerNotification");
        if (existingNotification && existingNotification.parentNode === document.body) {
          document.body.removeChild(existingNotification);
        }
      };
    }
  };

  // src/ui/modules/tab-cloaker.js
  var tab_cloaker_default = {
    id: "tab-cloaker",
    title: "Tab Cloaker",
    description: "I swear! I'm just on google!",
    author: "Slash",
    defaultEnabled: true,
    code(api, container) {
      let intervalId = setInterval(() => {
        document.title = "Google";
        const linkElements = document.head.querySelectorAll('link[rel="icon"]');
        linkElements.forEach((linkElement) => {
          linkElement.href = "https://www.google.com/favicon.ico";
        });
      }, 1000);
      return () => {
        clearInterval(intervalId);
      };
    }
  };

  // src/ui/modules/auto-regenerate.js
  var auto_regenerate_default = {
    id: "auto-regenerate",
    title: "Auto Regenerate",
    description: "Auto-regenerate when filter is triggered using the API",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginBottom = "4px";
      status.style.color = "rgba(255,255,255,0.5)";
      status.textContent = "Listening for filter events...";
      container.appendChild(status);
      let lastTurnId = null;
      const listener = (data) => {
        if (data?.command === "filter_user_input" || data?.command === "filter_user_input_self_harm") {
          status.textContent = "Filter triggered! Auto-regenerating...";
          status.style.color = "#ffab40";
          if (lastTurnId && STATE.currentChatId && STATE.currentCharacterId) {
            regenerateMessage(lastTurnId).then(() => {
              status.textContent = "Auto-regenerated";
              status.style.color = "#69f0ae";
            }).catch((err) => {
              status.textContent = "Regen failed: " + err.message;
              status.style.color = "#ff5252";
            });
          } else {
            status.textContent = "Filter hit but no turn/chat known";
            status.style.color = "#ff5252";
          }
        }
        if (data?.turn?.turn_key?.turn_id && !data.turn.author?.is_human) {
          lastTurnId = data.turn.turn_key.turn_id;
        }
      };
      STATE.chatListeners.push(listener);
      return () => {
        const idx = STATE.chatListeners.indexOf(listener);
        if (idx >= 0)
          STATE.chatListeners.splice(idx, 1);
      };
    }
  };

  // src/ui/modules/usage-dashboard.js
  var usage_dashboard_default = {
    id: "usage-dashboard",
    title: "Usage Dashboard",
    description: "Monitor all your quotas and limits in one place",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gap = "6px";
      grid.style.marginTop = "6px";
      container.appendChild(grid);
      const makeCard = (label, value, max, color) => {
        const card = document.createElement("div");
        card.style.background = "rgba(255,255,255,0.04)";
        card.style.borderRadius = "8px";
        card.style.padding = "8px";
        card.style.border = "1px solid rgba(255,255,255,0.06)";
        card.innerHTML = `<div style="font-size:10px;color:rgba(255,255,255,0.45);margin-bottom:2px;">${label}</div><div style="font-size:15px;font-weight:600;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.35);">/${max}</span></div>`;
        return card;
      };
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.color = "rgba(255,255,255,0.5)";
      status.style.marginBottom = "4px";
      status.textContent = "Loading...";
      container.insertBefore(status, grid);
      const refreshBtn = document.createElement("button");
      refreshBtn.classList.add("cai-btn");
      refreshBtn.textContent = "Refresh";
      refreshBtn.style.width = "100%";
      container.appendChild(refreshBtn);
      async function load() {
        status.textContent = "Fetching...";
        status.style.color = "rgba(255,255,255,0.5)";
        grid.innerHTML = "";
        try {
          const features = Object.values(FEATURE_LIMITS);
          const results = await Promise.allSettled(features.map((f) => getFeatureLimit(f)));
          const quotas = await getUsageQuota();
          let balance = null;
          if (STATE.userId) {
            try {
              balance = await getUserBalances(STATE.userId);
            } catch (e) {}
          }
          features.forEach((feature, i) => {
            const res = results[i];
            let remaining = "?";
            let max = "?";
            let color = "var(--cai-text-secondary)";
            if (res.status === "fulfilled" && res.value.data) {
              const d = res.value.data;
              remaining = d.count_remaining ?? d.count ?? "?";
              max = d.max_limit ?? "?";
              if (remaining < max * 0.2)
                color = "var(--cai-accent-red)";
              else if (remaining < max * 0.5)
                color = "var(--cai-accent-amber)";
              else
                color = "var(--cai-accent-green)";
            }
            grid.appendChild(makeCard(feature.replace(/_/g, " "), remaining, max, color));
          });
          const usageVal = quotas.data?.MONTH ?? "?";
          grid.appendChild(makeCard("Messages This Month", usageVal, "~", "var(--cai-accent-purple)"));
          if (balance?.data?.balances) {
            const bal = balance.data.balances[0]?.amount ?? "0";
            grid.appendChild(makeCard("Charms", bal, "~", "var(--cai-accent-pink)"));
          }
          status.textContent = "Updated " + new Date().toLocaleTimeString();
          status.style.color = "var(--cai-accent-green)";
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "var(--cai-accent-red)";
        }
      }
      refreshBtn.addEventListener("click", load);
      load();
    }
  };

  // src/ui/modules/no-bloat.js
  var NO_BLOAT_KEYS = {
    hideSidebar: "cai_nb_hideSidebar",
    hideUpgradeBtn: "cai_nb_hideUpgradeBtn",
    hideCaiBadge: "cai_nb_hideCaiBadge",
    hideDisclaimer: "cai_nb_hideDisclaimer",
    hideNavButtons: "cai_nb_hideNavButtons",
    hideRecommended: "cai_nb_hideRecommended",
    hideTryThese: "cai_nb_hideTryThese",
    hideVoices: "cai_nb_hideVoices",
    hideScenes: "cai_nb_hideScenes",
    hideFooter: "cai_nb_hideFooter",
    hideShare: "cai_nb_hideShare",
    hideReport: "cai_nb_hideReport",
    hideLikeDislike: "cai_nb_hideLikeDislike",
    hideCharacterHeader: "cai_nb_hideCharacterHeader",
    hideGreetingCarousel: "cai_nb_hideGreetingCarousel"
  };
  function getSettings() {
    const s = {};
    Object.keys(NO_BLOAT_KEYS).forEach((k) => {
      s[k] = GM_getValue(NO_BLOAT_KEYS[k], false);
    });
    return s;
  }
  function isProtected(el) {
    if (!el)
      return true;
    if (el.closest && el.closest("#cai-modal, #cai-modal-backdrop, #cai-modmenu-fab, .cai-modmenu, .cai-fab, .cai-modal"))
      return true;
    if (el.dataset && (el.dataset.caiProtected || el.dataset.caiHidden))
      return false;
    return false;
  }
  function findButtonsByExactText(text) {
    return Array.from(document.querySelectorAll("button")).filter((btn) => {
      if (isProtected(btn))
        return false;
      return btn.textContent?.trim() === text;
    });
  }
  var injectedStyleEl = null;
  function buildNoBloatCSS() {
    const s = getSettings();
    let css = "";
    const isChatPage = location.pathname.includes("/chat/");
    if (s.hideSidebar) {
      css += `
            body > [role="complementary"],
            body > div > [role="complementary"],
            aside[role="complementary"] { display: none !important; }
        `;
    }
    if (s.hideUpgradeBtn) {
      css += `
            [role="complementary"] button,
            nav button,
            aside button {
                display: none !important;
            }
        `;
    }
    if (s.hideCaiBadge) {
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
    if (!css)
      return;
    injectedStyleEl = document.createElement("style");
    injectedStyleEl.id = "cai-nobloat-css";
    injectedStyleEl.textContent = css;
    document.head.appendChild(injectedStyleEl);
  }
  function applyNoBloatJS() {
    const s = getSettings();
    const isChatPage = location.pathname.includes("/chat/");
    if (s.hideUpgradeBtn) {
      findButtonsByExactText("Upgrade to").forEach((btn) => {
        if (!btn.dataset.caiNb)
          btn.dataset.caiNb = "1";
        btn.style.display = "none";
      });
    } else {
      document.querySelectorAll('button[data-cai-nb="1"]').forEach((btn) => {
        if (btn.textContent?.trim() === "Upgrade to") {
          btn.style.display = "";
          delete btn.dataset.caiNb;
        }
      });
    }
    if (s.hideDisclaimer && isChatPage) {
      const chatBody = document.getElementById("chat-body");
      if (chatBody) {
        const parent = chatBody.parentElement;
        if (parent) {
          const siblings = parent.children;
          for (let i = 0;i < siblings.length; i++) {
            const el = siblings[i];
            if (el === chatBody)
              continue;
            const txt = el.textContent || "";
            if (txt.includes("This is A.I.") || txt.includes("not a real person")) {
              if (!el.dataset.caiNb)
                el.dataset.caiNb = "1";
              el.style.display = "none";
            }
          }
        }
      }
    } else {
      document.querySelectorAll('[data-cai-nb="1"]').forEach((el) => {
        const txt = el.textContent || "";
        if (txt.includes("This is A.I.") || txt.includes("not a real person")) {
          el.style.display = "";
          delete el.dataset.caiNb;
        }
      });
    }
    if (s.hideCaiBadge && isChatPage) {
      document.querySelectorAll("div, span").forEach((el) => {
        if (isProtected(el))
          return;
        if (el.children.length > 0)
          return;
        if (el.textContent?.trim() === "c.ai") {
          const parent = el.parentElement;
          if (parent && !isProtected(parent)) {
            if (!parent.dataset.caiNb)
              parent.dataset.caiNb = "1";
            parent.style.display = "none";
          }
        }
      });
    } else {
      document.querySelectorAll('[data-cai-nb="1"]').forEach((el) => {
        if (el.querySelector && el.querySelector("*")?.textContent?.trim() === "c.ai") {
          el.style.display = "";
          delete el.dataset.caiNb;
        }
      });
    }
  }
  var observer = null;
  var debounceTimer = null;
  function debouncedApply() {
    if (debounceTimer)
      clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyNoBloatCSS();
      applyNoBloatJS();
    }, 150);
  }
  function startObserver() {
    if (observer)
      observer.disconnect();
    observer = new MutationObserver((mutations) => {
      let shouldApply = false;
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
          shouldApply = true;
          break;
        }
      }
      if (shouldApply)
        debouncedApply();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  var no_bloat_default = {
    id: "no-bloat",
    title: "NoBloat UI",
    description: "Remove clutter, ads, and unnecessary UI elements",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const opts = [
        { key: "hideSidebar", label: "Hide Sidebar" },
        { key: "hideUpgradeBtn", label: "Hide Upgrade Button" },
        { key: "hideCaiBadge", label: 'Hide "c.ai" Badge' },
        { key: "hideDisclaimer", label: "Hide AI Disclaimer" },
        { key: "hideNavButtons", label: "Hide Discover/Feed/Charms/Labs" },
        { key: "hideRecommended", label: "Hide Recommended Characters" },
        { key: "hideTryThese", label: 'Hide "Try these" Section' },
        { key: "hideVoices", label: "Hide Voices Section" },
        { key: "hideScenes", label: "Hide Scenes Section" },
        { key: "hideFooter", label: "Hide Footer" },
        { key: "hideShare", label: "Hide Share Button" },
        { key: "hideReport", label: "Hide Report Button" },
        { key: "hideLikeDislike", label: "Hide Like/Dislike Buttons" },
        { key: "hideCharacterHeader", label: "Hide Character Header in Chat" },
        { key: "hideGreetingCarousel", label: "Hide Greeting Carousel" }
      ];
      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gap = "4px";
      container.appendChild(grid);
      opts.forEach((opt) => {
        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        label.style.fontSize = "11px";
        label.style.color = "var(--cai-text-secondary)";
        label.style.cursor = "pointer";
        label.style.padding = "4px";
        label.style.borderRadius = "6px";
        label.style.background = "rgba(255,255,255,0.02)";
        label.style.userSelect = "none";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = GM_getValue(NO_BLOAT_KEYS[opt.key], false);
        cb.style.width = "14px";
        cb.style.height = "14px";
        cb.addEventListener("change", () => {
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
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        if (injectedStyleEl) {
          injectedStyleEl.remove();
          injectedStyleEl = null;
        }
        document.querySelectorAll("[data-cai-nb]").forEach((el) => {
          el.style.display = "";
          delete el.dataset.caiNb;
        });
      };
    }
  };

  // src/ui/modules/chat-themes.js
  var THEME_STORAGE_KEY = "cai_chat_theme";
  var PRESETS = {
    default: { name: "Default", bg: "", bubbleUser: "", bubbleAi: "", textUser: "", textAi: "", font: "", fontSize: "", opacity: "", blur: "" },
    amoled: { name: "AMOLED", bg: "#000000", bubbleUser: "#1a1a1a", bubbleAi: "#0d0d0d", textUser: "#ffffff", textAi: "#e0e0e0", font: "", fontSize: "14px", opacity: "0.95", blur: "0px" },
    midnight: { name: "Midnight Blue", bg: "#0a0e27", bubbleUser: "#1a237e", bubbleAi: "#0d1b3e", textUser: "#c5cae9", textAi: "#9fa8da", font: "", fontSize: "14px", opacity: "0.92", blur: "4px" },
    paper: { name: "Paper", bg: "#f5f0e8", bubbleUser: "#ffffff", bubbleAi: "#f0ebe3", textUser: "#2d2d2d", textAi: "#4a4a4a", font: "Georgia, serif", fontSize: "15px", opacity: "0.98", blur: "0px" },
    cyberpunk: { name: "Cyberpunk", bg: "#0d0221", bubbleUser: "#ff00ff20", bubbleAi: "#00ffff15", textUser: "#ff00ff", textAi: "#00ffff", font: "monospace", fontSize: "13px", opacity: "0.9", blur: "2px" },
    ocean: { name: "Ocean", bg: "#001e3c", bubbleUser: "#01579b", bubbleAi: "#002f6c", textUser: "#b3e5fc", textAi: "#81d4fa", font: "", fontSize: "14px", opacity: "0.9", blur: "6px" },
    rose: { name: "Rose Gold", bg: "#1a0a0f", bubbleUser: "#5d1a3a", bubbleAi: "#3d1026", textUser: "#ffc1e3", textAi: "#f8bbd0", font: "", fontSize: "14px", opacity: "0.92", blur: "4px" },
    forest: { name: "Forest", bg: "#0a1f0a", bubbleUser: "#1b5e20", bubbleAi: "#0d3b0d", textUser: "#c8e6c9", textAi: "#a5d6a7", font: "", fontSize: "14px", opacity: "0.9", blur: "4px" }
  };
  function getCurrentTheme() {
    return GM_getValue(THEME_STORAGE_KEY, {});
  }
  function saveTheme(theme) {
    GM_setValue(THEME_STORAGE_KEY, theme);
  }
  function generateThemeCSS(theme) {
    let css = "";
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
    if (theme.blur && theme.blur !== "0px") {
      css += `[class*="bg-surface"], [class*="bg-primary-foreground"] { backdrop-filter: blur(${theme.blur}) !important; }`;
    }
    return css;
  }
  function injectThemeCSS(theme) {
    let old = document.getElementById("cai-theme-css");
    if (old)
      old.remove();
    const css = generateThemeCSS(theme);
    if (!css)
      return;
    const style = document.createElement("style");
    style.id = "cai-theme-css";
    style.textContent = css;
    document.head.appendChild(style);
  }
  var chat_themes_default = {
    id: "chat-themes",
    title: "Chat Themes",
    description: "Customize chat colors, backgrounds, fonts, and more",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      let current = getCurrentTheme();
      const presetRow = document.createElement("div");
      presetRow.style.marginBottom = "8px";
      const presetLabel = document.createElement("div");
      presetLabel.textContent = "Preset";
      presetLabel.style.fontSize = "11px";
      presetLabel.style.color = "var(--cai-text-secondary)";
      presetLabel.style.marginBottom = "2px";
      presetRow.appendChild(presetLabel);
      const presetSelect = document.createElement("select");
      presetSelect.classList.add("cai-select");
      Object.entries(PRESETS).forEach(([key, p]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
      });
      const resetOpt = document.createElement("option");
      resetOpt.value = "custom";
      resetOpt.textContent = "Custom";
      presetSelect.appendChild(resetOpt);
      presetRow.appendChild(presetSelect);
      container.appendChild(presetRow);
      function createColorRow(label, key) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.marginBottom = "4px";
        const lbl = document.createElement("span");
        lbl.textContent = label;
        lbl.style.fontSize = "11px";
        lbl.style.color = "var(--cai-text-secondary)";
        const input = document.createElement("input");
        input.type = "color";
        input.value = current[key] || "#ffffff";
        input.style.width = "28px";
        input.style.height = "20px";
        input.style.border = "none";
        input.style.background = "none";
        input.style.cursor = "pointer";
        input.addEventListener("input", () => {
          current[key] = input.value;
          saveTheme(current);
          injectThemeCSS(current);
        });
        row.appendChild(lbl);
        row.appendChild(input);
        return { row, input };
      }
      const bgRow = createColorRow("Background", "bg");
      container.appendChild(bgRow.row);
      const bubbleUserRow = createColorRow("User Bubble", "bubbleUser");
      container.appendChild(bubbleUserRow.row);
      const bubbleAiRow = createColorRow("AI Bubble", "bubbleAi");
      container.appendChild(bubbleAiRow.row);
      const textUserRow = createColorRow("User Text", "textUser");
      container.appendChild(textUserRow.row);
      const textAiRow = createColorRow("AI Text", "textAi");
      container.appendChild(textAiRow.row);
      const imgRow = document.createElement("div");
      imgRow.style.marginBottom = "6px";
      const imgLabel = document.createElement("div");
      imgLabel.textContent = "Background Image URL";
      imgLabel.style.fontSize = "11px";
      imgLabel.style.color = "var(--cai-text-secondary)";
      imgRow.appendChild(imgLabel);
      const imgInput = document.createElement("input");
      imgInput.classList.add("cai-input");
      imgInput.placeholder = "https://...";
      imgInput.value = current.bgImage || "";
      imgInput.addEventListener("change", () => {
        current.bgImage = imgInput.value;
        saveTheme(current);
        injectThemeCSS(current);
      });
      imgRow.appendChild(imgInput);
      container.appendChild(imgRow);
      const fontRow = document.createElement("div");
      fontRow.style.marginBottom = "6px";
      const fontLabel = document.createElement("div");
      fontLabel.textContent = "Font Family";
      fontLabel.style.fontSize = "11px";
      fontLabel.style.color = "var(--cai-text-secondary)";
      fontRow.appendChild(fontLabel);
      const fontInput = document.createElement("input");
      fontInput.classList.add("cai-input");
      fontInput.placeholder = "e.g. Georgia, serif";
      fontInput.value = current.font || "";
      fontInput.addEventListener("change", () => {
        current.font = fontInput.value;
        saveTheme(current);
        injectThemeCSS(current);
      });
      fontRow.appendChild(fontInput);
      container.appendChild(fontRow);
      presetSelect.addEventListener("change", () => {
        const key = presetSelect.value;
        if (key === "custom")
          return;
        current = { ...PRESETS[key] };
        delete current.name;
        saveTheme(current);
        injectThemeCSS(current);
        bgRow.input.value = current.bg || "#ffffff";
        bubbleUserRow.input.value = current.bubbleUser || "#ffffff";
        bubbleAiRow.input.value = current.bubbleAi || "#ffffff";
        textUserRow.input.value = current.textUser || "#ffffff";
        textAiRow.input.value = current.textAi || "#ffffff";
        imgInput.value = current.bgImage || "";
        fontInput.value = current.font || "";
      });
      const resetBtn = document.createElement("button");
      resetBtn.classList.add("cai-btn");
      resetBtn.textContent = "Reset to Default";
      resetBtn.addEventListener("click", () => {
        current = {};
        saveTheme(current);
        injectThemeCSS(current);
        bgRow.input.value = "#ffffff";
        bubbleUserRow.input.value = "#ffffff";
        bubbleAiRow.input.value = "#ffffff";
        textUserRow.input.value = "#ffffff";
        textAiRow.input.value = "#ffffff";
        imgInput.value = "";
        fontInput.value = "";
        presetSelect.value = "default";
      });
      container.appendChild(resetBtn);
      injectThemeCSS(current);
      return () => {
        const old = document.getElementById("cai-theme-css");
        if (old)
          old.remove();
      };
    }
  };

  // src/ui/modules/filter-bypass.js
  var FILTER_BYPASS_STRATEGIES = [
    (text) => text.split("").join("​"),
    (text) => text.replace(/a/gi, "а").replace(/e/gi, "е").replace(/o/gi, "о").replace(/p/gi, "р").replace(/c/gi, "с").replace(/x/gi, "х"),
    (text) => text.replace(/\b\w/g, (c) => String.fromCharCode(c.charCodeAt(0) + 917504)),
    (text) => text.split(" ").map((w) => w.split("").join("‌")).join(" "),
    (text) => text.replace(/([aeiou])/gi, "$1́"),
    (text) => text
  ];
  var filter_bypass_default = {
    id: "filter-bypass",
    title: "Filter Bypass",
    description: "Auto-retry filtered messages with obfuscation strategies",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginBottom = "6px";
      status.style.color = "var(--cai-text-secondary)";
      status.textContent = "Listening for filter events...";
      container.appendChild(status);
      const strategyLabel = document.createElement("div");
      strategyLabel.textContent = "Bypass Strategy";
      strategyLabel.style.fontSize = "11px";
      strategyLabel.style.color = "var(--cai-text-secondary)";
      strategyLabel.style.marginBottom = "2px";
      container.appendChild(strategyLabel);
      const strategySelect = document.createElement("select");
      strategySelect.classList.add("cai-select");
      [
        { value: 0, label: "Zero-width spaces" },
        { value: 1, label: "Cyrillic homoglyphs" },
        { value: 2, label: "Unicode tags" },
        { value: 3, label: "Zero-width non-joiner" },
        { value: 4, label: "Accent marks" },
        { value: 5, label: "No obfuscation (retry only)" }
      ].forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        strategySelect.appendChild(option);
      });
      container.appendChild(strategySelect);
      const maxRetries = document.createElement("input");
      maxRetries.type = "number";
      maxRetries.classList.add("cai-input");
      maxRetries.placeholder = "Max retries (default 3)";
      maxRetries.value = GM_getValue("cai_fb_maxRetries", "3");
      maxRetries.style.marginTop = "4px";
      container.appendChild(maxRetries);
      const attemptsMap = new Map;
      const listener = (data) => {
        if (data?.command === "filter_user_input" || data?.command === "filter_user_input_self_harm") {
          const lastTurn = STATE.turns.find((t) => t.author?.is_human);
          if (!lastTurn) {
            status.textContent = "Filter hit but no human turn found";
            status.style.color = "var(--cai-accent-amber)";
            return;
          }
          const turnId = lastTurn.turn_key?.turn_id;
          const chatId = lastTurn.turn_key?.chat_id;
          const originalText = lastTurn.candidates?.[0]?.raw_content || "";
          let attempts = attemptsMap.get(turnId) || 0;
          const max = parseInt(maxRetries.value) || 3;
          const strategyIdx = parseInt(strategySelect.value) || 0;
          if (attempts >= max) {
            status.textContent = `Max retries (${max}) reached for this message`;
            status.style.color = "var(--cai-accent-red)";
            return;
          }
          attempts++;
          attemptsMap.set(turnId, attempts);
          status.textContent = `Filter triggered! Retry ${attempts}/${max}...`;
          status.style.color = "var(--cai-accent-amber)";
          const obfuscated = FILTER_BYPASS_STRATEGIES[strategyIdx](originalText);
          setTimeout(() => {
            if (STATE.currentCharacterId && chatId) {
              sendMessage(obfuscated, { chatId, characterId: STATE.currentCharacterId });
              status.textContent = `Sent obfuscated attempt ${attempts}`;
              status.style.color = "var(--cai-accent-green)";
            }
          }, 300);
        }
      };
      STATE.chatListeners.push(listener);
      maxRetries.addEventListener("change", () => {
        GM_setValue("cai_fb_maxRetries", maxRetries.value);
      });
      return () => {
        const idx = STATE.chatListeners.indexOf(listener);
        if (idx >= 0)
          STATE.chatListeners.splice(idx, 1);
      };
    }
  };

  // src/ui/modules/model-enforcer.js
  var model_enforcer_default = {
    id: "model-enforcer",
    title: "Model Enforcer",
    description: "Force a specific AI model for all chats",
    author: "Slash",
    defaultEnabled: false,
    code(api, container) {
      container.innerHTML = "";
      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginBottom = "6px";
      status.style.color = "var(--cai-text-secondary)";
      status.textContent = "Select a model to enforce";
      container.appendChild(status);
      const select = document.createElement("select");
      select.classList.add("cai-select");
      container.appendChild(select);
      const enforceBtn = document.createElement("button");
      enforceBtn.classList.add("cai-btn");
      enforceBtn.textContent = "Apply to Current Chat";
      container.appendChild(enforceBtn);
      const autoLabel = document.createElement("label");
      autoLabel.style.display = "flex";
      autoLabel.style.alignItems = "center";
      autoLabel.style.gap = "6px";
      autoLabel.style.fontSize = "11px";
      autoLabel.style.color = "var(--cai-text-secondary)";
      autoLabel.style.marginTop = "6px";
      autoLabel.style.cursor = "pointer";
      const autoCb = document.createElement("input");
      autoCb.type = "checkbox";
      autoCb.checked = GM_getValue("cai_model_auto", false);
      autoLabel.appendChild(autoCb);
      autoLabel.appendChild(document.createTextNode("Auto-apply on every chat load"));
      container.appendChild(autoLabel);
      let availableModels = [];
      async function loadModels() {
        try {
          const res = await getAvailableModels();
          if (res.status >= 200 && res.status < 300 && res.data) {
            availableModels = res.data.available_models || [];
            STATE.availableModels = availableModels;
            STATE.defaultModelType = res.data.default_model_type;
            select.innerHTML = "";
            availableModels.forEach((m) => {
              const opt = document.createElement("option");
              opt.value = m;
              const labelKey = Object.keys(MODEL_TYPES).find((k) => MODEL_TYPES[k] === m) || m.replace("MODEL_TYPE_", "").toLowerCase();
              opt.textContent = labelKey;
              select.appendChild(opt);
            });
            const saved = GM_getValue("cai_model_enforced", "");
            if (saved)
              select.value = saved;
            status.textContent = `${availableModels.length} models available`;
            status.style.color = "var(--cai-accent-green)";
          } else {
            status.textContent = "Failed to load models";
            status.style.color = "var(--cai-accent-red)";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "var(--cai-accent-red)";
        }
      }
      enforceBtn.addEventListener("click", async () => {
        if (!STATE.currentChatId) {
          status.textContent = "No chat detected. Open a chat first.";
          status.style.color = "var(--cai-accent-red)";
          return;
        }
        status.textContent = "Applying...";
        status.style.color = "var(--cai-text-secondary)";
        try {
          const res = await updateChatModel(STATE.currentChatId, select.value);
          if (res.status >= 200 && res.status < 300) {
            status.textContent = `Set to ${select.options[select.selectedIndex].text}`;
            status.style.color = "var(--cai-accent-green)";
          } else {
            status.textContent = "Failed: " + (res.data?.message || res.status);
            status.style.color = "var(--cai-accent-red)";
          }
        } catch (e) {
          status.textContent = "Error: " + e.message;
          status.style.color = "var(--cai-accent-red)";
        }
      });
      autoCb.addEventListener("change", () => {
        GM_setValue("cai_model_auto", autoCb.checked);
        if (autoCb.checked) {
          GM_setValue("cai_model_enforced", select.value);
        }
      });
      select.addEventListener("change", () => {
        if (autoCb.checked) {
          GM_setValue("cai_model_enforced", select.value);
        }
      });
      let lastChatId = null;
      const autoApply = () => {
        if (!autoCb.checked)
          return;
        const enforced = GM_getValue("cai_model_enforced", "");
        if (!enforced || !STATE.currentChatId || STATE.currentChatId === lastChatId)
          return;
        lastChatId = STATE.currentChatId;
        updateChatModel(STATE.currentChatId, enforced).catch(() => {});
      };
      const chatObserver = setInterval(autoApply, 2000);
      loadModels();
      return () => {
        clearInterval(chatObserver);
      };
    }
  };

  // src/index.js
  function init() {
    console.log("%c[CAI-MOD] Initializing ModMenu...", "color:#00ff88; font-size:14px; font-weight:bold");
    GM_addStyle(cssStyles);
    hookFetch();
    hookXHR();
    hookWebSocket();
    registerModule(model_switcher_default);
    registerModule(response_length_default);
    registerModule(chat_manager_default);
    registerModule(message_checker_default);
    registerModule(tab_cloaker_default);
    registerModule(auto_regenerate_default);
    registerModule(usage_dashboard_default);
    registerModule(no_bloat_default);
    registerModule(chat_themes_default);
    registerModule(filter_bypass_default);
    registerModule(model_enforcer_default);
    const api = {
      CONFIG,
      MODEL_TYPES,
      WS_COMMANDS,
      EVENT_TYPES,
      FEATURE_LIMITS,
      STATE,
      connectWS: connectWebSocket,
      sendCommand: sendWSCommand,
      sendMessage,
      regenerateMessage,
      editTurnCandidate,
      removeTurn,
      abortGeneration,
      ping,
      createChat,
      neoRequest,
      plusRequest,
      getChatInfo,
      getTurns,
      getRecentChats,
      getRecentChatsGlobal,
      getCharacterInfo,
      getCharacterInfos,
      searchCharacters,
      voteCharacter,
      hideCharacter,
      getVoiceOverride,
      checkVoted,
      getUserSettings,
      getUser,
      getUserPersonas,
      generateImage,
      imagineChat,
      updateChatModel,
      updateChatResponseLength,
      renameChat,
      archiveChat,
      unarchiveChat,
      copyChat,
      deleteTurns,
      resurrectChat,
      getFeatureLimit,
      consumeFeatureLimit,
      getAvailableModels,
      getTurnCount,
      getUsageQuota,
      getProductPrices,
      getUserBalances,
      getProductStatus,
      purchaseProduct,
      generateUUID,
      setAuthToken: (t) => {
        STATE.authToken = t;
      },
      setUserId: (id) => {
        STATE.userId = id;
      },
      setUserName: (name) => {
        STATE.userName = name;
      },
      setChatId: (id) => {
        STATE.currentChatId = id;
      },
      setCharacterId: (id) => {
        STATE.currentCharacterId = id;
      },
      getAuthToken,
      getUserInfo,
      onChatEvent: (cb) => STATE.chatListeners.push(cb),
      onWS: (cb) => STATE.wsListeners.push(cb),
      removeChatListener: (cb) => {
        const idx = STATE.chatListeners.indexOf(cb);
        if (idx >= 0)
          STATE.chatListeners.splice(idx, 1);
      },
      getLogs: () => STATE.logs,
      getWSHistory: () => STATE.wsHistory,
      getHTTPHistory: () => STATE.httpHistory,
      clearLogs: () => {
        STATE.logs = [];
        STATE.wsHistory = [];
        STATE.httpHistory = [];
      }
    };
    createModmenu(api);
    window.CAI = api;
    tryExtract();
    setTimeout(tryExtract, 2000);
    const tokenPoll = setInterval(() => {
      if (STATE.authToken) {
        clearInterval(tokenPoll);
        console.log("[CAI-MOD] Auth token acquired");
        if (!STATE.currentChatId && STATE.currentCharacterId) {
          getRecentChats(STATE.currentCharacterId).then((res) => {
            if (res.data?.chats?.length > 0) {
              STATE.currentChatId = res.data.chats[0].chat_id;
              console.log("[CAI-MOD] Chat ID auto-detected:", STATE.currentChatId);
            }
          }).catch(() => {});
        }
      }
    }, 500);
    if (location.pathname.includes("/chat/")) {
      setTimeout(() => connectWebSocket(), 1500);
    }
    console.log("%c[CAI-MOD] Ready. Use window.CAI in console.", "color:#00ff88; font-size:12px;");
  }
  function tryExtract() {
    try {
      const nextData = window.__NEXT_DATA__;
      if (nextData?.props?.pageProps?.user) {
        const u = nextData.props.pageProps.user;
        const userObj = u.user || u;
        STATE.userId = String(userObj.id || userObj.user_id || STATE.userId || "");
        STATE.userName = u.name || userObj.username || userObj.name || STATE.userName || "";
      }
    } catch (e) {}
    const pathMatch = location.pathname.match(/\/chat\/([^\/]+)/);
    if (pathMatch) {
      STATE.currentCharacterId = pathMatch[1];
    }
    const histMatch = location.search.match(/[?&]hist=([^&]+)/);
    if (histMatch) {
      STATE.currentChatId = histMatch[1];
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
