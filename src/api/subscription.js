import { CONFIG } from '../constants.js';
import { STATE } from '../state.js';
import { getAuthToken } from '../utils.js';

export async function subRequest(method, endpoint, body = null) {
    const headers = {
        'Authorization': `Token ${STATE.authToken || getAuthToken() || ''}`,
        'Content-Type': 'application/json'
    };
    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const url = `${CONFIG.SUB_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch(e) {}
    return { status: res.status, data: json, text };
}

export async function getProductPrices() {
    return subRequest('GET', '/v1/vc/product-prices');
}

export async function getUserBalances(userId) {
    return subRequest('GET', `/v1/vc/users/${userId}/balances`);
}

export async function getProductStatus(userId, productId) {
    return subRequest('GET', `/v1/vc/users/${userId}/products/${productId}/status`);
}

export async function purchaseProduct(userId, productId, paymentMethod = 'charm') {
    return subRequest('POST', `/v1/vc/users/${userId}/purchase`, { product_id: productId, payment_method: paymentMethod });
}
