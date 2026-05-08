import { hookFetch, hookXHR, hookWebSocket } from './hooks/index.js';
import { createModmenu, registerModule } from './ui/modmenu.js';
import { cssStyles } from './ui/styles.js';
import { STATE } from './state.js';
import { connectWebSocket } from './api/chat.js';
import { getRecentChats } from './api/chat-data.js';
import * as chatAPI from './api/chat.js';
import * as chatDataAPI from './api/chat-data.js';
import * as characterAPI from './api/character.js';
import * as userAPI from './api/user.js';
import * as imageAPI from './api/image.js';
import * as clientAPI from './api/client.js';
import * as featureLimitsAPI from './api/feature-limits.js';
import * as subscriptionAPI from './api/subscription.js';
import { CONFIG, MODEL_TYPES, WS_COMMANDS, EVENT_TYPES, FEATURE_LIMITS } from './constants.js';
import { generateUUID, getAuthToken, getUserInfo, log } from './utils.js';

import modelSwitcher from './ui/modules/model-switcher.js';
import responseLength from './ui/modules/response-length.js';
import chatManager from './ui/modules/chat-manager.js';
import messageChecker from './ui/modules/message-checker.js';
import tabCloaker from './ui/modules/tab-cloaker.js';
import autoRegenerate from './ui/modules/auto-regenerate.js';
import usageDashboard from './ui/modules/usage-dashboard.js';
import noBloat from './ui/modules/no-bloat.js';
import chatThemes from './ui/modules/chat-themes.js';
import filterBypass from './ui/modules/filter-bypass.js';
import modelEnforcer from './ui/modules/model-enforcer.js';

function init() {
    console.log('%c[CAI-MOD] Initializing ModMenu...', 'color:#00ff88; font-size:14px; font-weight:bold');

    GM_addStyle(cssStyles);

    hookFetch();
    hookXHR();
    hookWebSocket();

    registerModule(modelSwitcher);
    registerModule(responseLength);
    registerModule(chatManager);
    registerModule(messageChecker);
    registerModule(tabCloaker);
    registerModule(autoRegenerate);
    registerModule(usageDashboard);
    registerModule(noBloat);
    registerModule(chatThemes);
    registerModule(filterBypass);
    registerModule(modelEnforcer);

    const api = {
        CONFIG,
        MODEL_TYPES,
        WS_COMMANDS,
        EVENT_TYPES,
        FEATURE_LIMITS,
        STATE,
        connectWS: connectWebSocket,
        sendCommand: chatAPI.sendWSCommand,
        sendMessage: chatAPI.sendMessage,
        regenerateMessage: chatAPI.regenerateMessage,
        editTurnCandidate: chatAPI.editTurnCandidate,
        removeTurn: chatAPI.removeTurn,
        abortGeneration: chatAPI.abortGeneration,
        ping: chatAPI.ping,
        createChat: chatAPI.createChat,
        neoRequest: clientAPI.neoRequest,
        plusRequest: clientAPI.plusRequest,
        getChatInfo: chatDataAPI.getChatInfo,
        getTurns: chatDataAPI.getTurns,
        getRecentChats: chatDataAPI.getRecentChats,
        getRecentChatsGlobal: chatDataAPI.getRecentChatsGlobal,
        getCharacterInfo: characterAPI.getCharacterInfo,
        getCharacterInfos: characterAPI.getCharacterInfos,
        searchCharacters: characterAPI.searchCharacters,
        voteCharacter: characterAPI.voteCharacter,
        hideCharacter: characterAPI.hideCharacter,
        getVoiceOverride: characterAPI.getVoiceOverride,
        checkVoted: characterAPI.checkVoted,
        getUserSettings: userAPI.getUserSettings,
        getUser: userAPI.getUser,
        getUserPersonas: userAPI.getUserPersonas,
        generateImage: imageAPI.generateImage,
        imagineChat: imageAPI.imagineChat,
        updateChatModel: chatDataAPI.updateChatModel,
        updateChatResponseLength: chatDataAPI.updateChatResponseLength,
        renameChat: chatDataAPI.renameChat,
        archiveChat: chatDataAPI.archiveChat,
        unarchiveChat: chatDataAPI.unarchiveChat,
        copyChat: chatDataAPI.copyChat,
        deleteTurns: chatDataAPI.deleteTurns,
        resurrectChat: chatDataAPI.resurrectChat,
        getFeatureLimit: featureLimitsAPI.getFeatureLimit,
        consumeFeatureLimit: featureLimitsAPI.consumeFeatureLimit,
        getAvailableModels: featureLimitsAPI.getAvailableModels,
        getTurnCount: featureLimitsAPI.getTurnCount,
        getUsageQuota: featureLimitsAPI.getUsageQuota,
        getProductPrices: subscriptionAPI.getProductPrices,
        getUserBalances: subscriptionAPI.getUserBalances,
        getProductStatus: subscriptionAPI.getProductStatus,
        purchaseProduct: subscriptionAPI.purchaseProduct,
        generateUUID,
        setAuthToken: (t) => { STATE.authToken = t; },
        setUserId: (id) => { STATE.userId = id; },
        setUserName: (name) => { STATE.userName = name; },
        setChatId: (id) => { STATE.currentChatId = id; },
        setCharacterId: (id) => { STATE.currentCharacterId = id; },
        getAuthToken,
        getUserInfo,
        onChatEvent: (cb) => STATE.chatListeners.push(cb),
        onWS: (cb) => STATE.wsListeners.push(cb),
        removeChatListener: (cb) => {
            const idx = STATE.chatListeners.indexOf(cb);
            if (idx >= 0) STATE.chatListeners.splice(idx, 1);
        },
        getLogs: () => STATE.logs,
        getWSHistory: () => STATE.wsHistory,
        getHTTPHistory: () => STATE.httpHistory,
        clearLogs: () => { STATE.logs = []; STATE.wsHistory = []; STATE.httpHistory = []; }
    };

    createModmenu(api);

    window.CAI = api;

    tryExtract();
    setTimeout(tryExtract, 2000);

    const tokenPoll = setInterval(() => {
        if (STATE.authToken) {
            clearInterval(tokenPoll);
            console.log('[CAI-MOD] Auth token acquired');
            if (!STATE.currentChatId && STATE.currentCharacterId) {
                getRecentChats(STATE.currentCharacterId).then(res => {
                    if (res.data?.chats?.length > 0) {
                        STATE.currentChatId = res.data.chats[0].chat_id;
                        console.log('[CAI-MOD] Chat ID auto-detected:', STATE.currentChatId);
                    }
                }).catch(() => {});
            }
        }
    }, 500);

    if (location.pathname.includes('/chat/')) {
        setTimeout(() => connectWebSocket(), 1500);
    }

    console.log('%c[CAI-MOD] Ready. Use window.CAI in console.', 'color:#00ff88; font-size:12px;');
}

function tryExtract() {
    try {
        const nextData = window.__NEXT_DATA__;
        if (nextData?.props?.pageProps?.user) {
            const u = nextData.props.pageProps.user;
            const userObj = u.user || u;
            STATE.userId = String(userObj.id || userObj.user_id || STATE.userId || '');
            STATE.userName = u.name || userObj.username || userObj.name || STATE.userName || '';
        }
    } catch(e) {}

    const pathMatch = location.pathname.match(/\/chat\/([^\/]+)/);
    if (pathMatch) {
        STATE.currentCharacterId = pathMatch[1];
    }
    const histMatch = location.search.match(/[?&]hist=([^&]+)/);
    if (histMatch) {
        STATE.currentChatId = histMatch[1];
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
