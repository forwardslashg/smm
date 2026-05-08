import { neoRequest, plusRequest } from './client.js';

export async function getUserSettings() {
    return plusRequest('GET', '/chat/user/settings/');
}

export async function getUser() {
    return neoRequest('GET', '/user/');
}

export async function getUserPersonas(forceRefresh = false) {
    return neoRequest('GET', `/character/v1/get_user_personas?force_refresh=${forceRefresh ? 1 : 0}`);
}
