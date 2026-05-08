import { CONFIG } from './constants.js';
import { STATE } from './state.js';

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function now() {
    return new Date().toISOString();
}

export function log(type, data) {
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
    STATE.wsListeners.forEach(cb => {
        try { cb(type, data); } catch(e) {}
    });
    const style = type === 'WS_SEND' ? 'color:#0f0' : type === 'WS_RECV' ? 'color:#0af' : type === 'ERROR' ? 'color:#f00' : 'color:#fa0';
    console.log(`%c[CAI-MOD] ${type}`, style, data);
}

export function getAuthToken() {
    if (STATE.authToken) return STATE.authToken;
    const match = document.cookie.match(/token=([^;]+)/);
    if (match) return match[1];
    return null;
}

export function getUserInfo() {
    return { userId: STATE.userId, userName: STATE.userName, authToken: STATE.authToken };
}
