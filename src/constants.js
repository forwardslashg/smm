export const CONFIG = {
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

export const FEATURE_LIMITS = {
    SWIPE: 'swipe',
    FAST_FORWARD: 'fast_forward',
    MEMO: 'memo',
    VOICE_CALL: 'voice_call',
    CHAT_IMAGE_ATTACHMENT: 'chat_image_attachment',
    CHAT_TIME_SPENT_MIN: 'chat_time_spent_min'
};

export const MODEL_TYPES = {
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

export const WS_COMMANDS = {
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

export const EVENT_TYPES = {
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
