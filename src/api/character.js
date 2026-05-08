import { neoRequest, plusRequest } from './client.js';

export async function getCharacterInfo(characterId) {
    return neoRequest('POST', '/character/v1/get_character_info', { external_id: characterId });
}

export async function getCharacterInfos(characterIds) {
    return neoRequest('POST', '/character/v1/get_character_infos', { external_ids: characterIds });
}

export async function searchCharacters(query, options = {}) {
    const params = new URLSearchParams();
    params.append('query', query);
    if (options.tagId) params.append('tagId', options.tagId);
    if (options.sortedBy) params.append('sortedBy', options.sortedBy);
    if (options.cursor) params.append('cursor', options.cursor);
    return neoRequest('GET', `/search/v1/character?${params.toString()}`);
}

export async function voteCharacter(characterId, vote) {
    return neoRequest('POST', '/character/v1/vote_character', { external_id: characterId, vote });
}

export async function hideCharacter(characterId) {
    return plusRequest('POST', '/chat/character/hide/', { external_id: characterId });
}

export async function getVoiceOverride(characterId) {
    return plusRequest('GET', `/chat/character/${characterId}/voice_override/`);
}

export async function checkVoted(characterId) {
    return neoRequest('GET', `/character/v1/character_voted/${characterId}/voted`);
}
