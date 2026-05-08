import { neoRequest } from './client.js';

export async function getFeatureLimit(feature) {
    return neoRequest('GET', `/feature_limits/${feature}`);
}

export async function consumeFeatureLimit(feature, count = 1) {
    return neoRequest('POST', `/feature_limits/${feature}/consume`, { count });
}

export async function getAvailableModels() {
    return neoRequest('GET', '/get-available-models');
}

export async function getTurnCount(chatMarkers) {
    return neoRequest('POST', '/turns/count', { chat_markers: chatMarkers });
}

export async function ping() {
    return neoRequest('GET', '/ping/');
}

export async function getUsageQuota(functionName = 'generate_turn', interval = 'MONTH') {
    return neoRequest('GET', `/usage?function=${functionName}&intervals=${interval}`);
}

export async function getVoiceOverride(characterId) {
    return neoRequest('GET', `/chat/character/${characterId}/voice_override/`);
}

export async function updateVoiceOverride(characterId, voiceId) {
    return neoRequest('POST', `/chat/character/${characterId}/voice_override/`, { voice_id: voiceId });
}
