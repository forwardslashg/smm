import { neoRequest } from './client.js';

export async function getChatInfo(chatId) {
    return neoRequest('GET', `/chat/${chatId}/?load_metadata=true`);
}

export async function getTurns(chatId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return neoRequest('GET', `/turns/${chatId}/${qs ? '?' + qs : ''}`);
}

export async function getRecentChats(characterId) {
    return neoRequest('GET', `/chats/recent/${encodeURIComponent(characterId)}`);
}

export async function getRecentChatsGlobal() {
    return neoRequest('GET', '/chats/recent/');
}

export async function updateChatModel(chatId, modelType) {
    return neoRequest('PATCH', `/chat/${chatId}/preferred-model-type`, { preferred_model_type: modelType });
}

export async function updateChatResponseLength(chatId, length) {
    return neoRequest('PATCH', `/chat/${chatId}/update-response-length`, { response_length: length });
}

export async function renameChat(chatId, name) {
    return neoRequest('PATCH', `/chat/${chatId}/update_name`, { name });
}

export async function archiveChat(chatId) {
    return neoRequest('PATCH', `/chat/${chatId}/archive`);
}

export async function unarchiveChat(chatId) {
    return neoRequest('PATCH', `/chat/${chatId}/unarchive`);
}

export async function copyChat(chatId, endTurnId, overrides = {}) {
    return neoRequest('POST', `/chat/${chatId}/copy`, { end_turn_id: endTurnId, overrides });
}

export async function deleteTurns(chatId, turnIds) {
    return neoRequest('POST', `/turns/${chatId}/remove`, { turn_ids: turnIds });
}

export async function resurrectChat(chatId) {
    return neoRequest('GET', `/chat/${chatId}/resurrect`);
}

export async function getFeatureLimit(feature) {
    return neoRequest('GET', `/feature_limits/${feature}`);
}

export async function consumeFeatureLimit(feature, count = 1) {
    return neoRequest('POST', `/feature_limits/${feature}/consume`, { count });
}

export async function getUsageQuota() {
    return neoRequest('GET', '/usage?function=generate_turn&intervals=MONTH');
}
