export const STATE = {
    ws: null,
    authToken: null,
    userId: null,
    userName: null,
    currentChatId: null,
    currentCharacterId: null,
    logs: [],
    wsHistory: [],
    httpHistory: [],
    chatListeners: [],
    wsListeners: [],
    httpListeners: [],
    isMenuOpen: true,
    interceptedMessages: [],
    primaryCandidateMap: {},
    turns: [],
    featureLimits: {},
    availableModels: [],
    defaultModelType: null,
    charmBalance: 0,
    modelEnforcer: null
};

export function updateState(key, value) {
    STATE[key] = value;
}
