import { CONFIG } from '../constants.js';
import { STATE } from '../state.js';
import { log } from '../utils.js';

export function hookFetch() {
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
                    log('HTTP_RES', { url, status: response.status, body: json });
                }
            } catch(e) {}
        }
        return response;
    };
    console.log('[CAI-MOD] Fetch hooked');
}

export function hookXHR() {
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

export function hookWebSocket() {
    const OriginalWebSocket = window.WebSocket;
    window._caiOriginalWebSocket = OriginalWebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = new OriginalWebSocket(url, protocols);
        if (url.includes('neo.character.ai')) {
            STATE.ws = ws;
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
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => {
        if (typeof OriginalWebSocket[k] !== 'undefined') {
            window.WebSocket[k] = OriginalWebSocket[k];
        }
    });
    console.log('[CAI-MOD] WebSocket hooked');
}
