import { CONFIG } from '../constants.js';
import { STATE } from '../state.js';
import { generateUUID, log } from '../utils.js';
import { WS_COMMANDS } from '../constants.js';

export function connectWebSocket() {
    if (STATE.ws && (STATE.ws.readyState === 1 || STATE.ws.readyState === 0)) {
        console.log('[CAI-MOD] WS already connected');
        return STATE.ws;
    }
    const ws = new WebSocket(CONFIG.WS_URL);
    STATE.ws = ws;

    ws.onopen = () => {
        log('WS_EVENT', { event: 'open' });
    };

    ws.onmessage = (e) => {
        let data = e.data;
        try { data = JSON.parse(data); } catch(err) {}
        log('WS_RECV', data);

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

        STATE.chatListeners.forEach(cb => {
            try { cb(data); } catch(e) {}
        });
    };

    ws.onclose = () => {
        log('WS_EVENT', { event: 'close' });
        STATE.ws = null;
    };

    ws.onerror = (err) => {
        log('WS_EVENT', { event: 'error', error: err });
    };

    return ws;
}

export function sendWSCommand(command, payload, requestId = null) {
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

export function sendMessage(text, options = {}) {
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

export function regenerateMessage(turnId, options = {}) {
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

export function editTurnCandidate(turnId, candidateId, newText, options = {}) {
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

export function removeTurn(turnId, options = {}) {
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

export function abortGeneration(requestId) {
    return sendWSCommand(WS_COMMANDS.ABORT_GENERATION, {}, requestId);
}

export function ping() {
    return sendWSCommand(WS_COMMANDS.PING, {});
}

export function createChat(characterId, options = {}) {
    const payload = {
        character_id: characterId,
        chat_type: options.chatType || 'TYPE_ONE_ON_ONE'
    };
    return sendWSCommand(WS_COMMANDS.CREATE_CHAT, payload);
}
