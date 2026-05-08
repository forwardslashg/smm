import { CONFIG } from '../constants.js';
import { STATE } from '../state.js';
import { getAuthToken, log } from '../utils.js';

export async function neoRequest(method, endpoint, body = null, extraHeaders = {}) {
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

export async function plusRequest(method, endpoint, body = null) {
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

export async function trpcQuery(procedure, input = {}) {
    const url = `${CONFIG.TRPC_BASE}/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{json:input}}))}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Token ${STATE.authToken || getAuthToken() || ''}` },
        credentials: 'include'
    });
    const json = await res.json();
    return json;
}
