// ==UserScript==
// @name         Character.AI ModMenu
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Comprehensive mod menu for Character.AI with chat hooks, API access, and internal debugging tools
// @author       You
// @match        https://character.ai/*
// @match        https://*.character.ai/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // CORE INTERNALS & CONFIG
    // ============================================================
    const CONFIG = {
        WS_URL: 'wss://neo.character.ai/ws/',
        NEO_BASE: 'https://neo.character.ai',
        PLUS_BASE: 'https://plus.character.ai',
        MULTIMODAL_BASE: 'https://neo.character.ai/multimodal/api',
        FEED_BASE: 'https://feed.api.character.ai',
        SUB_BASE: 'https://subscription.api.character.ai',
        USER_BASE: 'https://user.api.character.ai',
        TRPC_BASE: 'https://character.ai/api/trpc',
        logLimit: 200,
        interceptEnabled: true,
        autoLogWS: true,
        autoLogHTTP: false
    };

    const MODEL_TYPES = {
        fast: 'MODEL_TYPE_FAST',
        smart: 'MODEL_TYPE_SMART',
        balanced: 'MODEL_TYPE_BALANCED',
        family_friendly: 'MODEL_TYPE_FAMILY_FRIENDLY',
        memory_optimized: 'MODEL_TYPE_MEMORY_OPTIMIZED',
        multilingual: 'MODEL_TYPE_MULTILINGUAL',
        dynamic: 'MODEL_TYPE_DYNAMIC',
        thinking: 'MODEL_TYPE_THINKING',
        romantic: 'MODEL_TYPE_ROMANTIC',
        french: 'MODEL_TYPE_FRENCH',
        chinese: 'MODEL_TYPE_CHINESE',
        deep_synth: 'MODEL_TYPE_DEEP_SYNTH',
        deep_synth_lite: 'MODEL_TYPE_DEEP_SYNTH_LITE',
        expressive: 'MODEL_TYPE_EXPRESSIVE'
    };

    const WS_COMMANDS = {
        CREATE_CHAT: 'create_chat',
        CREATE_TURN: 'create_turn',
        CREATE_GROUP_TURN: 'smart_reply_v2',
        CREATE_AND_GENERATE_TURN: 'create_and_generate_turn',
        GENERATE_TURN: 'generate_turn',
        GENERATE_TURN_CANDIDATE: 'generate_turn_candidate',
        GENERATE_GREETING: 'generate_greeting',
        GENERATE_IN_CHAT_IMAGE: 'generate_in_chat_image',
        REMOVE_TURN: 'remove_turn',
        SET_TURN_PIN: 'set_turn_pin',
        ABORT_GENERATION: 'abort_generation',
        PING: 'ping',
        EDIT_TURN_CANDIDATE: 'edit_turn_candidate',
        MU_STATE_UPDATE: 'state_update',
        UPDATE_PRIMARY_CANDIDATE: 'update_primary_candidate'
    };

    const EVENT_TYPES = {
        ADD_TURN: 'add_turn',
        UPDATE_TURN: 'update_turn',
        CREATE_CHAT_RESPONSE: 'create_chat_response',
        NEO_ERROR: 'neo_error',
        FILTER_USER_INPUT: 'filter_user_input',
        FILTER_USER_INPUT_SELF_HARM: 'filter_user_input_self_harm',
        REMOVE_TURNS_RESPONSE: 'remove_turns_response',
        REMOVE_TURN: 'remove_turn',
        UPDATE_MU_ROOM_RESPONSE: 'update_mu_room_response',
        DELETE_MU_ROOM: 'delete_mu_room',
        MU_STATE_UPDATE: 'state_update',
        UPDATE_SCENE_INSTANCE: 'update_scene_instance',
        OK_RESPONSE: 'ok',
        GENERATE_IN_CHAT_IMAGE: 'generate_in_chat_image'
    };

    // ============================================================
    // STATE
    // ============================================================
    const STATE = {
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
        turns: []
    };

    // ============================================================
    // UTILS
    // ============================================================
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function now() {
        return new Date().toISOString();
    }

    function log(type, data) {
        const entry = { time: Date.now(), iso: now(), type, data };
        STATE.logs.push(entry);
        if (STATE.logs.length > CONFIG.logLimit) STATE.logs.shift();
        if (CONFIG.autoLogWS && (type === 'WS_SEND' || type === 'WS_RECV')) {
            STATE.wsHistory.push(entry);
            if (STATE.wsHistory.length > CONFIG.logLimit) STATE.wsHistory.shift();
        }
        if (CONFIG.autoLogHTTP && (type === 'HTTP_REQ' || type === 'HTTP_RES')) {
            STATE.httpHistory.push(entry);
            if (STATE.httpHistory.length > CONFIG.logLimit) STATE.httpHistory.shift();
        }
        // Notify listeners
        STATE.wsListeners.forEach(cb => {
            try { cb(type, data); } catch(e) {}
        });
        // Console
        const style = type === 'WS_SEND' ? 'color:#0f0' : type === 'WS_RECV' ? 'color:#0af' : type === 'ERROR' ? 'color:#f00' : 'color:#fa0';
        console.log(`%c[CAI-MOD] ${type}`, style, data);
    }

    function getAuthToken() {
        // Try to extract from localStorage or cookies
        if (STATE.authToken) return STATE.authToken;
        // The app stores firebase tokens but the neo token is fetched dynamically
        // We can try to intercept it from existing requests
        const match = document.cookie.match(/token=([^;]+)/);
        if (match) return match[1];
        return null;
    }

    function getUserInfo() {
        return { userId: STATE.userId, userName: STATE.userName, authToken: STATE.authToken };
    }

    // ============================================================
    // HTTP API CLIENT
    // ============================================================
    async function neoRequest(method, endpoint, body = null, extraHeaders = {}) {
        const headers = {
            'Authorization': `Token ${STATE.authToken || getAuthToken() || ''}`,
            'Content-Type': 'application/json',
            'Origin-ID': 'web-next',
            ...extraHeaders
        };
        const opts = { method, headers, credentials: 'include' };
        if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
        const url = `${CONFIG.NEO_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        log('HTTP_REQ', { method, url, body });
        const res = await fetch(url, opts);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch(e) {}
        log('HTTP_RES', { status: res.status, url, body: json || text });
        return { status: res.status, data: json, text };
    }

    async function plusRequest(method, endpoint, body = null) {
        const headers = {
            'Authorization': `Token ${STATE.authToken || getAuthToken() || ''}`,
            'Content-Type': 'application/json'
        };
        const opts = { method, headers, credentials: 'include' };
        if (body) opts.body = JSON.stringify(body);
        const url = `${CONFIG.PLUS_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const res = await fetch(url, opts);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch(e) {}
        return { status: res.status, data: json, text };
    }

    // ============================================================
    // WEBSOCKET MANAGEMENT
    // ============================================================
    function connectWebSocket() {
        if (STATE.ws && (STATE.ws.readyState === 1 || STATE.ws.readyState === 0)) {
            console.log('[CAI-MOD] WS already connected');
            return STATE.ws;
        }
        const ws = new WebSocket(CONFIG.WS_URL);
        STATE.ws = ws;

        ws.onopen = () => {
            log('WS_EVENT', { event: 'open' });
            updateStatus('WS: Connected');
        };

        ws.onmessage = (e) => {
            let data = e.data;
            try { data = JSON.parse(data); } catch(err) {}
            log('WS_RECV', data);

            // Track state from responses
            if (data && data.turn) {
                if (data.command === 'add_turn') {
                    STATE.turns.unshift(data.turn);
                    STATE.currentChatId = data.turn.turn_key?.chat_id;
                } else if (data.command === 'update_turn') {
                    const idx = STATE.turns.findIndex(t => t.turn_key?.turn_id === data.turn.turn_key?.turn_id);
                    if (idx >= 0) STATE.turns[idx] = { ...STATE.turns[idx], ...data.turn };
                    else STATE.turns.unshift(data.turn);
                }
                if (data.turn.primary_candidate_id) {
                    STATE.primaryCandidateMap[data.turn.turn_key?.turn_id] = data.turn.primary_candidate_id;
                }
            }
            if (data?.chat_info?.type) {
                // chat metadata in response
            }

            // Notify chat listeners
            STATE.chatListeners.forEach(cb => {
                try { cb(data); } catch(e) {}
            });
        };

        ws.onclose = () => {
            log('WS_EVENT', { event: 'close' });
            updateStatus('WS: Disconnected');
            STATE.ws = null;
        };

        ws.onerror = (err) => {
            log('WS_EVENT', { event: 'error', error: err });
            updateStatus('WS: Error');
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
            origin_id: 'web-next'
        };
        const send = () => {
            log('WS_SEND', msg);
            ws.send(JSON.stringify(msg));
        };
        if (ws.readyState === 1) {
            send();
        } else {
            ws.onopen = send;
        }
        return rid;
    }

    // ============================================================
    // CHAT API FUNCTIONS
    // ============================================================
    function sendMessage(text, options = {}) {
        const chatId = options.chatId || STATE.currentChatId || generateUUID();
        const characterId = options.characterId || STATE.currentCharacterId;
        const turnId = options.turnId || generateUUID();
        const candidateId = options.candidateId || generateUUID();
        const userName = options.userName || STATE.userName || 'User';
        const userId = options.userId || STATE.userId || '0';

        if (!characterId) {
            console.error('[CAI-MOD] No character_id set. Use options.characterId or setCurrentCharacter()');
            return null;
        }

        const payload = {
            chat_type: options.chatType || 'TYPE_ONE_ON_ONE',
            num_candidates: options.numCandidates || 1,
            tts_enabled: options.ttsEnabled || false,
            selected_language: options.language || '',
            character_id: characterId,
            user_name: userName,
            turn: {
                turn_key: { turn_id: turnId, chat_id: chatId },
                author: { author_id: userId, is_human: true, name: userName },
                candidates: [{ candidate_id: candidateId, raw_content: text }],
                primary_candidate_id: candidateId
            },
            previous_annotations: options.previousAnnotations || {
                boring:0,not_boring:0,inaccurate:0,not_inaccurate:0,repetitive:0,not_repetitive:0,
                out_of_character:0,not_out_of_character:0,bad_memory:0,not_bad_memory:0,long:0,not_long:0,
                short:0,not_short:0,ends_chat_early:0,not_ends_chat_early:0,funny:0,not_funny:0,
                interesting:0,not_interesting:0,helpful:0,not_helpful:0
            },
            generate_comparison: options.generateComparison || false
        };

        return sendWSCommand(WS_COMMANDS.CREATE_AND_GENERATE_TURN, payload);
    }

    function regenerateMessage(turnId, options = {}) {
        const chatId = options.chatId || STATE.currentChatId;
        const characterId = options.characterId || STATE.currentCharacterId;
        if (!chatId || !characterId) {
            console.error('[CAI-MOD] chatId and characterId required for regenerate');
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
            console.error('[CAI-MOD] chatId required');
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
            console.error('[CAI-MOD] chatId required');
            return null;
        }
        const payload = {
            turn_key: { turn_id: turnId, chat_id: chatId }
        };
        return sendWSCommand(WS_COMMANDS.REMOVE_TURN, payload);
    }

    function abortGeneration(requestId) {
        const payload = {};
        return sendWSCommand(WS_COMMANDS.ABORT_GENERATION, payload, requestId);
    }

    function ping() {
        return sendWSCommand(WS_COMMANDS.PING, {});
    }

    function createChat(characterId, options = {}) {
        const payload = {
            character_id: characterId,
            chat_type: options.chatType || 'TYPE_ONE_ON_ONE'
        };
        return sendWSCommand(WS_COMMANDS.CREATE_CHAT, payload);
    }

    // ============================================================
    // HTTP DATA FUNCTIONS
    // ============================================================
    async function getChatInfo(chatId) {
        return neoRequest('GET', `/chat/${chatId}/?load_metadata=true`);
    }

    async function getTurns(chatId, params = {}) {
        const qs = new URLSearchParams(params).toString();
        return neoRequest('GET', `/turns/${chatId}/${qs ? '?' + qs : ''}`);
    }

    async function getRecentChats(characterId) {
        return neoRequest('GET', `/chats/recent/${encodeURIComponent(characterId)}`);
    }

    async function getCharacterInfo(characterId) {
        return neoRequest('POST', '/character/v1/get_character_info', { external_id: characterId });
    }

    async function getCharacterInfos(characterIds) {
        return neoRequest('POST', '/character/v1/get_character_infos', { external_ids: characterIds });
    }

    async function getAvailableModels() {
        return neoRequest('GET', '/get-available-models');
    }

    async function getUserSettings() {
        return plusRequest('GET', '/chat/user/settings/');
    }

    async function getUser() {
        return neoRequest('GET', '/user/');
    }

    async function updateChatModel(chatId, modelType) {
        return neoRequest('PATCH', `/chat/${chatId}/preferred-model-type`, { preferred_model_type: modelType });
    }

    async function updateChatResponseLength(chatId, length) {
        return neoRequest('PATCH', `/chat/${chatId}/update-response-length`, { response_length: length });
    }

    async function renameChat(chatId, name) {
        return neoRequest('PATCH', `/chat/${chatId}/update_name`, { name });
    }

    async function archiveChat(chatId) {
        return neoRequest('PATCH', `/chat/${chatId}/archive`);
    }

    async function unarchiveChat(chatId) {
        return neoRequest('PATCH', `/chat/${chatId}/unarchive`);
    }

    async function copyChat(chatId, endTurnId, overrides = {}) {
        return neoRequest('POST', `/chat/${chatId}/copy`, { end_turn_id: endTurnId, overrides });
    }

    async function deleteTurns(chatId, turnIds) {
        return neoRequest('POST', `/turns/${chatId}/remove`, { turn_ids: turnIds });
    }

    async function resurrectChat(chatId) {
        return neoRequest('GET', `/chat/${chatId}/resurrect`);
    }

    async function getFeatureLimit(feature) {
        return neoRequest('GET', `/feature_limits/${feature}`);
    }

    async function consumeFeatureLimit(feature, count = 1) {
        return neoRequest('POST', `/feature_limits/${feature}/consume`, { count });
    }

    async function getUsageQuota() {
        return neoRequest('GET', '/usage?function=generate_turn&intervals=MONTH');
    }

    async function searchCharacters(query, options = {}) {
        const params = new URLSearchParams();
        params.append('query', query);
        if (options.tagId) params.append('tagId', options.tagId);
        if (options.sortedBy) params.append('sortedBy', options.sortedBy);
        if (options.cursor) params.append('cursor', options.cursor);
        return neoRequest('GET', `/search/v1/character?${params.toString()}`);
    }

    async function getRecentChatsGlobal() {
        return neoRequest('GET', '/chats/recent/');
    }

    async function voteCharacter(characterId, vote) {
        return neoRequest('POST', '/character/v1/vote_character', { external_id: characterId, vote });
    }

    async function hideCharacter(characterId) {
        return plusRequest('POST', '/chat/character/hide/', { external_id: characterId });
    }

    async function getVoiceOverride(characterId) {
        return plusRequest('GET', `/chat/character/${characterId}/voice_override/`);
    }

    async function getUserPersonas(forceRefresh = false) {
        return neoRequest('GET', `/character/v1/get_user_personas?force_refresh=${forceRefresh ? 1 : 0}`);
    }

    async function generateImage(prompt, options = {}) {
        return neoRequest('POST', '/multimodal/api/v1/media/generation/generateImage', { prompt, ...options });
    }

    async function imagineChat(chatId, prompt) {
        return neoRequest('POST', '/image/in_chat_imagine', { chat_id: chatId, prompt });
    }

    // ============================================================
    // TRPC HELPERS
    // ============================================================
    async function trpcQuery(procedure, input = {}) {
        const url = `${CONFIG.TRPC_BASE}/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{json:input}}))}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Token ${STATE.authToken || getAuthToken() || ''}` },
            credentials: 'include'
        });
        const json = await res.json();
        return json;
    }

    // ============================================================
    // INTERCEPTION HOOKS
    // ============================================================
    function hookWebSocket() {
        const OriginalWebSocket = window.WebSocket;
        window._caiOriginalWebSocket = OriginalWebSocket;
        window.WebSocket = function(url, protocols) {
            const ws = new OriginalWebSocket(url, protocols);
            if (url.includes('neo.character.ai')) {
                STATE.ws = ws;
                // Already handled by connectWebSocket, but let's also capture native
                const origSend = ws.send.bind(ws);
                ws.send = function(data) {
                    if (CONFIG.interceptEnabled) {
                        let parsed = data;
                        try { parsed = JSON.parse(data); } catch(e) {}
                        log('WS_SEND', parsed);
                    }
                    return origSend(data);
                };
                ws.addEventListener('message', (e) => {
                    if (CONFIG.interceptEnabled) {
                        let parsed = e.data;
                        try { parsed = JSON.parse(e.data); } catch(err) {}
                        log('WS_RECV', parsed);
                    }
                });
            }
            return ws;
        };
        window.WebSocket.prototype = OriginalWebSocket.prototype;
        // Copy static constants so WebSocket.OPEN / CONNECTING etc still work
        ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => {
            if (typeof OriginalWebSocket[k] !== 'undefined') {
                window.WebSocket[k] = OriginalWebSocket[k];
            }
        });
        console.log('[CAI-MOD] WebSocket hooked');
    }

    function hookFetch() {
        const originalFetch = window.fetch;
        window._caiOriginalFetch = originalFetch;
        window.fetch = async function(...args) {
            const url = args[0];
            const options = args[1] || {};
            if (CONFIG.interceptEnabled && (typeof url === 'string') && (
                url.includes('neo.character.ai') ||
                url.includes('plus.character.ai') ||
                url.includes('character.ai/api')
            )) {
                // Capture auth token from outgoing requests
                let auth = null;
                if (options.headers) {
                    if (typeof options.headers.get === 'function') {
                        auth = options.headers.get('Authorization') || options.headers.get('authorization');
                    } else {
                        auth = options.headers.Authorization || options.headers.authorization;
                    }
                }
                if (auth && auth.startsWith('Token ')) {
                    STATE.authToken = auth.replace('Token ', '').trim();
                }
                log('HTTP_REQ', { url, method: options.method || 'GET', body: options.body });
            }
            const response = await originalFetch(...args);
            // Parse response for data extraction if it's a targeted URL
            if (CONFIG.interceptEnabled && (typeof url === 'string') && (
                url.includes('neo.character.ai') ||
                url.includes('plus.character.ai')
            )) {
                try {
                    const clone = response.clone();
                    const text = await clone.text();
                    let json = null;
                    try { json = JSON.parse(text); } catch(e) {}
                    if (json) {
                        // Extract chat ID from chat endpoints
                        if (json.chat?.chat_id) {
                            STATE.currentChatId = json.chat.chat_id;
                            updateFields();
                        }
                        if (json.metadata?.chat_id) {
                            STATE.currentChatId = json.metadata.chat_id;
                            updateFields();
                        }
                        // Extract from recent chats list
                        if (Array.isArray(json.chats) && json.chats[0]?.chat_id) {
                            STATE.currentChatId = json.chats[0].chat_id;
                            updateFields();
                        }
                        // Extract user info from /user/ endpoint
                        if (json.user?.id) {
                            STATE.userId = String(json.user.id);
                            STATE.userName = json.user.username || json.user.name || STATE.userName;
                            updateFields();
                        }
                        log('HTTP_RES', { url, status: response.status, body: json });
                    }
                } catch(e) {}
            }
            return response;
        };
        console.log('[CAI-MOD] Fetch hooked');
    }

    function hookXHR() {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization' && value.startsWith('Token ')) {
                STATE.authToken = value.replace('Token ', '').trim();
            }
            return origSetHeader.call(this, header, value);
        };

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._caiUrl = url;
            this._caiMethod = method;
            return origOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function(body) {
            if (CONFIG.interceptEnabled && this._caiUrl && (
                this._caiUrl.includes('neo.character.ai') ||
                this._caiUrl.includes('plus.character.ai')
            )) {
                log('HTTP_REQ', { url: this._caiUrl, method: this._caiMethod, body });
            }
            return origSend.call(this, body);
        };
        console.log('[CAI-MOD] XHR hooked');
    }

    // ============================================================
    // MODMENU UI
    // ============================================================
    let menuEl = null;
    let statusEl = null;
    let contentEl = null;

    function createMenu() {
        if (menuEl) return;
        const div = document.createElement('div');
        div.id = 'cai-modmenu';
        div.innerHTML = `
            <div id="cai-modmenu-header">
                <span>CAI ModMenu</span>
                <button id="cai-modmenu-toggle">-</button>
            </div>
            <div id="cai-modmenu-body">
                <div id="cai-modmenu-tabs">
                    <button class="cai-tab active" data-tab="main">Main</button>
                    <button class="cai-tab" data-tab="chat">Chat</button>
                    <button class="cai-tab" data-tab="api">API</button>
                    <button class="cai-tab" data-tab="logs">Logs</button>
                    <button class="cai-tab" data-tab="tools">Tools</button>
                </div>
                <div id="cai-modmenu-content">
                    <div class="cai-panel active" data-panel="main">
                        <div class="cai-section">
                            <label>Auth Token</label>
                            <input type="text" id="cai-auth-token" readonly placeholder="Intercepting..." />
                            <button id="cai-copy-token">Copy</button>
                        </div>
                        <div class="cai-section">
                            <label>User ID</label>
                            <input type="text" id="cai-user-id" readonly />
                        </div>
                        <div class="cai-section">
                            <label>Current Chat ID</label>
                            <input type="text" id="cai-chat-id" />
                            <button id="cai-set-chat">Set</button>
                        </div>
                        <div class="cai-section">
                            <label>Current Character ID</label>
                            <input type="text" id="cai-char-id" />
                            <button id="cai-set-char">Set</button>
                        </div>
                        <div class="cai-section">
                            <label>WS Status</label>
                            <div id="cai-ws-status">Unknown</div>
                        </div>
                        <div class="cai-section">
                            <button id="cai-connect-ws">Connect WS</button>
                            <button id="cai-disconnect-ws">Disconnect WS</button>
                        </div>
                    </div>
                    <div class="cai-panel" data-panel="chat">
                        <div class="cai-section">
                            <label>Send Message (WS)</label>
                            <textarea id="cai-msg-text" rows="3" placeholder="Type message..."></textarea>
                            <button id="cai-send-msg">Send via WS</button>
                            <button id="cai-send-custom">Send Custom JSON</button>
                        </div>
                        <div class="cai-section">
                            <label>Quick Actions</label>
                            <button id="cai-ping">Ping</button>
                            <button id="cai-abort">Abort Last</button>
                            <button id="cai-get-turns">Get Turns</button>
                            <button id="cai-get-chat-info">Get Chat Info</button>
                        </div>
                        <div class="cai-section">
                            <label>Model Type</label>
                            <select id="cai-model-select">
                                ${Object.entries(MODEL_TYPES).map(([k,v]) => `<option value="${v}">${k}</option>`).join('')}
                            </select>
                            <button id="cai-set-model">Set Model</button>
                        </div>
                    </div>
                    <div class="cai-panel" data-panel="api">
                        <div class="cai-section">
                            <label>HTTP Endpoint</label>
                            <input type="text" id="capi-endpoint" placeholder="/user/" />
                            <select id="capi-method">
                                <option>GET</option>
                                <option>POST</option>
                                <option>PATCH</option>
                                <option>PUT</option>
                                <option>DELETE</option>
                            </select>
                        </div>
                        <div class="cai-section">
                            <label>Body (JSON)</label>
                            <textarea id="capi-body" rows="3" placeholder="{}"/></textarea>
                            <button id="capi-send">Send NEO Request</button>
                            <button id="capi-send-plus">Send PLUS Request</button>
                        </div>
                        <div class="cai-section">
                            <label>Response</label>
                            <pre id="capi-response"></pre>
                        </div>
                        <div class="cai-section">
                            <label>Quick API Calls</label>
                            <button id="capi-user">Get User</button>
                            <button id="capi-settings">Get Settings</button>
                            <button id="capi-models">Get Models</button>
                            <button id="capi-recent">Get Recent Chats</button>
                            <button id="capi-usage">Get Usage</button>
                        </div>
                    </div>
                    <div class="cai-panel" data-panel="logs">
                        <div class="cai-section">
                            <button id="clog-clear">Clear</button>
                            <button id="clog-export">Export JSON</button>
                            <button id="clog-copy-last">Copy Last</button>
                        </div>
                        <div class="cai-section">
                            <label>Filter</label>
                            <input type="text" id="clog-filter" placeholder="type or content..." />
                        </div>
                        <div id="cai-logs-container"></div>
                    </div>
                    <div class="cai-panel" data-panel="tools">
                        <div class="cai-section">
                            <label>Search Characters</label>
                            <input type="text" id="ctool-search" placeholder="Query..." />
                            <button id="ctool-search-btn">Search</button>
                        </div>
                        <div class="cai-section">
                            <label>Character ID Lookup</label>
                            <input type="text" id="ctool-char-lookup" placeholder="External ID" />
                            <button id="ctool-char-info">Get Info</button>
                        </div>
                        <div class="cai-section">
                            <label>Vote Character</label>
                            <input type="text" id="ctool-vote-id" placeholder="Character ID" />
                            <button id="ctool-upvote">Upvote</button>
                            <button id="ctool-downvote">Downvote</button>
                        </div>
                        <div class="cai-section">
                            <label>Chat Tools</label>
                            <button id="ctool-rename">Rename Chat</button>
                            <button id="ctool-archive">Archive</button>
                            <button id="ctool-unarchive">Unarchive</button>
                            <button id="ctool-copy">Copy Chat</button>
                            <button id="ctool-resurrect">Resurrect</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        menuEl = div;

        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #cai-modmenu {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 380px;
                max-height: 80vh;
                background: #0d0d0d;
                color: #e0e0e0;
                border: 1px solid #333;
                border-radius: 8px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 12px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                overflow: hidden;
            }
            #cai-modmenu-header {
                background: #1a1a1a;
                padding: 10px 14px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            #cai-modmenu-header span { font-weight: bold; color: #00ff88; }
            #cai-modmenu-toggle {
                background: #333;
                border: none;
                color: #fff;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
            }
            #cai-modmenu-body {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            #cai-modmenu-tabs {
                display: flex;
                background: #111;
                border-bottom: 1px solid #333;
            }
            .cai-tab {
                flex: 1;
                background: transparent;
                border: none;
                color: #888;
                padding: 8px;
                cursor: pointer;
                font-size: 11px;
                border-bottom: 2px solid transparent;
            }
            .cai-tab.active { color: #00ff88; border-bottom-color: #00ff88; }
            #cai-modmenu-content {
                overflow-y: auto;
                padding: 10px;
                max-height: 60vh;
            }
            .cai-panel { display: none; }
            .cai-panel.active { display: block; }
            .cai-section { margin-bottom: 12px; }
            .cai-section label {
                display: block;
                color: #888;
                margin-bottom: 4px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .cai-section input, .cai-section textarea, .cai-section select {
                width: 100%;
                background: #1a1a1a;
                border: 1px solid #333;
                color: #e0e0e0;
                padding: 6px 8px;
                border-radius: 4px;
                font-size: 11px;
                box-sizing: border-box;
            }
            .cai-section button {
                background: #222;
                border: 1px solid #444;
                color: #e0e0e0;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                margin-top: 4px;
                margin-right: 4px;
            }
            .cai-section button:hover { background: #333; border-color: #00ff88; }
            #cai-ws-status { color: #fa0; }
            #capi-response {
                background: #1a1a1a;
                border: 1px solid #333;
                padding: 8px;
                border-radius: 4px;
                max-height: 150px;
                overflow: auto;
                white-space: pre-wrap;
                word-break: break-word;
            }
            #cai-logs-container {
                max-height: 200px;
                overflow-y: auto;
                background: #111;
                border: 1px solid #222;
                border-radius: 4px;
                padding: 6px;
            }
            .cai-log-entry {
                padding: 3px 0;
                border-bottom: 1px solid #1a1a1a;
                font-size: 10px;
            }
            .cai-log-time { color: #555; margin-right: 6px; }
            .cai-log-type-send { color: #0f0; }
            .cai-log-type-recv { color: #0af; }
            .cai-log-type-error { color: #f44; }
            .cai-log-type-req { color: #fa0; }
        `;
        document.head.appendChild(style);

        // Dragging
        let dragging = false, dragOffsetX = 0, dragOffsetY = 0;
        const header = div.querySelector('#cai-modmenu-header');
        header.addEventListener('mousedown', e => {
            dragging = true;
            dragOffsetX = e.clientX - div.offsetLeft;
            dragOffsetY = e.clientY - div.offsetTop;
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            div.style.left = (e.clientX - dragOffsetX) + 'px';
            div.style.top = (e.clientY - dragOffsetY) + 'px';
            div.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => dragging = false);

        // Tabs
        div.querySelectorAll('.cai-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                div.querySelectorAll('.cai-tab').forEach(t => t.classList.remove('active'));
                div.querySelectorAll('.cai-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                div.querySelector(`.cai-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
            });
        });

        // Toggle
        const toggleBtn = div.querySelector('#cai-modmenu-toggle');
        const body = div.querySelector('#cai-modmenu-body');
        toggleBtn.addEventListener('click', () => {
            STATE.isMenuOpen = !STATE.isMenuOpen;
            body.style.display = STATE.isMenuOpen ? 'flex' : 'none';
            toggleBtn.textContent = STATE.isMenuOpen ? '-' : '+';
        });

        // Bind main tab
        div.querySelector('#cai-set-chat').addEventListener('click', () => {
            STATE.currentChatId = div.querySelector('#cai-chat-id').value.trim();
            alert('Chat ID set: ' + STATE.currentChatId);
        });
        div.querySelector('#cai-set-char').addEventListener('click', () => {
            STATE.currentCharacterId = div.querySelector('#cai-char-id').value.trim();
            alert('Character ID set: ' + STATE.currentCharacterId);
        });
        div.querySelector('#cai-connect-ws').addEventListener('click', connectWebSocket);
        div.querySelector('#cai-disconnect-ws').addEventListener('click', () => {
            if (STATE.ws) STATE.ws.close();
        });
        div.querySelector('#cai-copy-token').addEventListener('click', () => {
            const token = STATE.authToken || '';
            navigator.clipboard.writeText(token);
        });

        // Bind chat tab
        div.querySelector('#cai-send-msg').addEventListener('click', () => {
            const text = div.querySelector('#cai-msg-text').value;
            if (text) sendMessage(text);
        });
        div.querySelector('#cai-send-custom').addEventListener('click', () => {
            const text = div.querySelector('#cai-msg-text').value;
            try {
                const json = JSON.parse(text);
                if (json.command && json.payload) {
                    sendWSCommand(json.command, json.payload, json.request_id);
                } else {
                    alert('Custom JSON must have {command, payload, [request_id]}');
                }
            } catch(e) {
                alert('Invalid JSON: ' + e.message);
            }
        });
        div.querySelector('#cai-ping').addEventListener('click', ping);
        div.querySelector('#cai-abort').addEventListener('click', () => abortGeneration());
        div.querySelector('#cai-get-turns').addEventListener('click', async () => {
            if (!STATE.currentChatId) return alert('Set chat ID first');
            const res = await getTurns(STATE.currentChatId);
            console.log('[CAI-MOD] Turns:', res);
            alert(`Turns fetched. See console.`);
        });
        div.querySelector('#cai-get-chat-info').addEventListener('click', async () => {
            if (!STATE.currentChatId) return alert('Set chat ID first');
            const res = await getChatInfo(STATE.currentChatId);
            console.log('[CAI-MOD] Chat info:', res);
            alert(`Chat info fetched. See console.`);
        });
        div.querySelector('#cai-set-model').addEventListener('click', async () => {
            if (!STATE.currentChatId) return alert('Set chat ID first');
            const model = div.querySelector('#cai-model-select').value;
            const res = await updateChatModel(STATE.currentChatId, model);
            console.log('[CAI-MOD] Model update:', res);
            alert('Model set to ' + model);
        });

        // Bind API tab
        div.querySelector('#capi-send').addEventListener('click', async () => {
            const endpoint = div.querySelector('#capi-endpoint').value;
            const method = div.querySelector('#capi-method').value;
            let body = null;
            try {
                const raw = div.querySelector('#capi-body').value.trim();
                if (raw) body = JSON.parse(raw);
            } catch(e) { return alert('Invalid JSON body'); }
            const res = await neoRequest(method, endpoint, body);
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-send-plus').addEventListener('click', async () => {
            const endpoint = div.querySelector('#capi-endpoint').value;
            const method = div.querySelector('#capi-method').value;
            let body = null;
            try {
                const raw = div.querySelector('#capi-body').value.trim();
                if (raw) body = JSON.parse(raw);
            } catch(e) { return alert('Invalid JSON body'); }
            const res = await plusRequest(method, endpoint, body);
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-user').addEventListener('click', async () => {
            const res = await getUser();
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-settings').addEventListener('click', async () => {
            const res = await getUserSettings();
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-models').addEventListener('click', async () => {
            const res = await getAvailableModels();
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-recent').addEventListener('click', async () => {
            const res = await getRecentChatsGlobal();
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });
        div.querySelector('#capi-usage').addEventListener('click', async () => {
            const res = await getUsageQuota();
            div.querySelector('#capi-response').textContent = JSON.stringify(res, null, 2);
        });

        // Bind logs tab
        div.querySelector('#clog-clear').addEventListener('click', () => {
            STATE.logs = [];
            renderLogs();
        });
        div.querySelector('#clog-export').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(STATE.logs, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cai-logs.json';
            a.click();
        });
        div.querySelector('#clog-copy-last').addEventListener('click', () => {
            const last = STATE.logs[STATE.logs.length - 1];
            if (last) navigator.clipboard.writeText(JSON.stringify(last, null, 2));
        });
        div.querySelector('#clog-filter').addEventListener('input', renderLogs);

        // Bind tools tab
        div.querySelector('#ctool-search-btn').addEventListener('click', async () => {
            const q = div.querySelector('#ctool-search').value;
            const res = await searchCharacters(q);
            console.log('[CAI-MOD] Search:', res);
            alert('Search results in console');
        });
        div.querySelector('#ctool-char-info').addEventListener('click', async () => {
            const id = div.querySelector('#ctool-char-lookup').value;
            const res = await getCharacterInfo(id);
            console.log('[CAI-MOD] Char info:', res);
            alert('Character info in console');
        });
        div.querySelector('#ctool-upvote').addEventListener('click', async () => {
            const id = div.querySelector('#ctool-vote-id').value;
            await voteCharacter(id, true);
            alert('Upvoted');
        });
        div.querySelector('#ctool-downvote').addEventListener('click', async () => {
            const id = div.querySelector('#ctool-vote-id').value;
            await voteCharacter(id, false);
            alert('Downvoted');
        });
        div.querySelector('#ctool-rename').addEventListener('click', async () => {
            const name = prompt('New chat name:');
            if (name && STATE.currentChatId) {
                await renameChat(STATE.currentChatId, name);
                alert('Renamed');
            }
        });
        div.querySelector('#ctool-archive').addEventListener('click', async () => {
            if (STATE.currentChatId) { await archiveChat(STATE.currentChatId); alert('Archived'); }
        });
        div.querySelector('#ctool-unarchive').addEventListener('click', async () => {
            if (STATE.currentChatId) { await unarchiveChat(STATE.currentChatId); alert('Unarchived'); }
        });
        div.querySelector('#ctool-copy').addEventListener('click', async () => {
            if (!STATE.currentChatId) return alert('No chat ID');
            const endTurnId = prompt('End turn ID (optional):') || undefined;
            const res = await copyChat(STATE.currentChatId, endTurnId);
            console.log('[CAI-MOD] Copy result:', res);
            alert('Copied. See console.');
        });
        div.querySelector('#ctool-resurrect').addEventListener('click', async () => {
            if (STATE.currentChatId) { await resurrectChat(STATE.currentChatId); alert('Resurrected'); }
        });

        statusEl = div.querySelector('#cai-ws-status');
        contentEl = div.querySelector('#cai-modmenu-content');
    }

    function updateStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function updateFields() {
        if (!menuEl) return;
        menuEl.querySelector('#cai-auth-token').value = STATE.authToken || '(intercepting...)';
        menuEl.querySelector('#cai-user-id').value = STATE.userId || '';
        menuEl.querySelector('#cai-chat-id').value = STATE.currentChatId || '';
        menuEl.querySelector('#cai-char-id').value = STATE.currentCharacterId || '';
    }

    function renderLogs() {
        if (!menuEl) return;
        const container = menuEl.querySelector('#cai-logs-container');
        const filter = menuEl.querySelector('#clog-filter').value.toLowerCase();
        const logs = STATE.logs.filter(l => {
            if (!filter) return true;
            const text = JSON.stringify(l).toLowerCase();
            return text.includes(filter);
        }).slice(-100);
        container.innerHTML = logs.map(l => {
            const typeClass = l.type === 'WS_SEND' ? 'cai-log-type-send' :
                              l.type === 'WS_RECV' ? 'cai-log-type-recv' :
                              l.type === 'ERROR' ? 'cai-log-type-error' :
                              l.type === 'HTTP_REQ' ? 'cai-log-type-req' : '';
            const preview = JSON.stringify(l.data).slice(0, 200);
            return `<div class="cai-log-entry"><span class="cai-log-time">${new Date(l.time).toLocaleTimeString()}</span><span class="${typeClass}">${l.type}</span> ${preview}</div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    }

    // ============================================================
    // GLOBAL API EXPOSURE
    // ============================================================
    window.CAI = {
        CONFIG,
        MODEL_TYPES,
        WS_COMMANDS,
        EVENT_TYPES,
        STATE,
        // Connection
        connectWS: connectWebSocket,
        sendCommand: sendWSCommand,
        // Messaging
        sendMessage,
        regenerateMessage,
        editTurnCandidate,
        removeTurn,
        abortGeneration,
        ping,
        createChat,
        // HTTP API
        neoRequest,
        plusRequest,
        getChatInfo,
        getTurns,
        getRecentChats,
        getCharacterInfo,
        getCharacterInfos,
        getAvailableModels,
        getUserSettings,
        getUser,
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
        getUsageQuota,
        searchCharacters,
        getRecentChatsGlobal,
        voteCharacter,
        hideCharacter,
        getVoiceOverride,
        getUserPersonas,
        generateImage,
        imagineChat,
        trpcQuery,
        // Utilities
        generateUUID,
        setAuthToken: (t) => { STATE.authToken = t; },
        setUserId: (id) => { STATE.userId = id; },
        setUserName: (name) => { STATE.userName = name; },
        setChatId: (id) => { STATE.currentChatId = id; },
        setCharacterId: (id) => { STATE.currentCharacterId = id; },
        getAuthToken: () => STATE.authToken,
        getUserInfo,
        // Listeners
        onChatEvent: (cb) => STATE.chatListeners.push(cb),
        onWS: (cb) => STATE.wsListeners.push(cb),
        removeChatListener: (cb) => {
            const idx = STATE.chatListeners.indexOf(cb);
            if (idx >= 0) STATE.chatListeners.splice(idx, 1);
        },
        // Logs
        getLogs: () => STATE.logs,
        getWSHistory: () => STATE.wsHistory,
        getHTTPHistory: () => STATE.httpHistory,
        clearLogs: () => { STATE.logs = []; STATE.wsHistory = []; STATE.httpHistory = []; },
        // Menu
        showMenu: () => { if (menuEl) menuEl.style.display = 'flex'; },
        hideMenu: () => { if (menuEl) menuEl.style.display = 'none'; },
        toggleMenu: () => { if (menuEl) menuEl.style.display = menuEl.style.display === 'none' ? 'flex' : 'none'; }
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('%c[CAI-MOD] Initializing ModMenu...', 'color:#00ff88; font-size:14px; font-weight:bold');
        hookFetch();
        hookXHR();
        hookWebSocket();
        createMenu();

        // Auto-extract data from page
        const tryExtract = () => {
            // Try to get user info from window.__NEXT_DATA__
            try {
                const nextData = window.__NEXT_DATA__;
                if (nextData?.props?.pageProps?.user) {
                    const u = nextData.props.pageProps.user;
                    // Character.AI nests user data under `user.user`
                    const userObj = u.user || u;
                    STATE.userId = String(userObj.id || userObj.user_id || STATE.userId || '');
                    STATE.userName = u.name || userObj.username || userObj.name || STATE.userName || '';
                }
            } catch(e) {}

            // Try to get chat/character from URL
            const pathMatch = location.pathname.match(/\/chat\/([^\/]+)/);
            if (pathMatch) {
                STATE.currentCharacterId = pathMatch[1];
            }
            const histMatch = location.search.match(/[?&]hist=([^&]+)/);
            if (histMatch) {
                STATE.currentChatId = histMatch[1];
            }

            updateFields();
        };

        // Poll for auth token extraction and chat ID detection
        const tokenPoll = setInterval(() => {
            if (STATE.authToken) {
                clearInterval(tokenPoll);
                updateFields();
                console.log('[CAI-MOD] Auth token acquired');
                // Try to detect chat ID if on a character page
                if (!STATE.currentChatId && STATE.currentCharacterId) {
                    getRecentChats(STATE.currentCharacterId).then(res => {
                        if (res.data?.chats?.length > 0) {
                            STATE.currentChatId = res.data.chats[0].chat_id;
                            updateFields();
                            console.log('[CAI-MOD] Chat ID auto-detected:', STATE.currentChatId);
                        }
                    }).catch(() => {});
                }
            }
        }, 500);

        tryExtract();
        setTimeout(tryExtract, 2000);

        // Auto-connect WS if on chat page
        if (location.pathname.includes('/chat/')) {
            setTimeout(() => connectWebSocket(), 1500);
        }

        // Log render loop
        setInterval(() => {
            if (menuEl) renderLogs();
        }, 500);

        // Keyboard shortcut: Ctrl+Shift+M to toggle menu
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                window.CAI.toggleMenu();
            }
        });

        console.log('%c[CAI-MOD] Ready. Open console and use CAI object.', 'color:#00ff88; font-size:12px;');
        console.log('%c[CAI-MOD] Examples:', 'color:#00ff88');
        console.log('  CAI.sendMessage("Hello")');
        console.log('  CAI.getUser()');
        console.log('  CAI.getTurns(CAI.STATE.currentChatId)');
        console.log('  CAI.updateChatModel(CAI.STATE.currentChatId, "MODEL_TYPE_SMART")');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();