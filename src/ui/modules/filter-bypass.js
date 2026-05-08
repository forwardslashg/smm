import { STATE } from '../../state.js';
import { sendMessage } from '../../api/chat.js';

const FILTER_BYPASS_STRATEGIES = [
    (text) => text.split('').join('\u200B'),
    (text) => text.replace(/a/gi, '\u0430').replace(/e/gi, '\u0435').replace(/o/gi, '\u043E').replace(/p/gi, '\u0440').replace(/c/gi, '\u0441').replace(/x/gi, '\u0445'),
    (text) => text.replace(/\b\w/g, c => String.fromCharCode(c.charCodeAt(0) + 0xE0000)),
    (text) => text.split(' ').map(w => w.split('').join('\u200C')).join(' '),
    (text) => text.replace(/([aeiou])/gi, '$1\u0301'),
    (text) => text
];

export default {
    id: 'filter-bypass',
    title: 'Filter Bypass',
    description: 'Auto-retry filtered messages with obfuscation strategies',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.marginBottom = '6px';
        status.style.color = 'var(--cai-text-secondary)';
        status.textContent = 'Listening for filter events...';
        container.appendChild(status);

        const strategyLabel = document.createElement('div');
        strategyLabel.textContent = 'Bypass Strategy';
        strategyLabel.style.fontSize = '11px';
        strategyLabel.style.color = 'var(--cai-text-secondary)';
        strategyLabel.style.marginBottom = '2px';
        container.appendChild(strategyLabel);

        const strategySelect = document.createElement('select');
        strategySelect.classList.add('cai-select');
        [
            { value: 0, label: 'Zero-width spaces' },
            { value: 1, label: 'Cyrillic homoglyphs' },
            { value: 2, label: 'Unicode tags' },
            { value: 3, label: 'Zero-width non-joiner' },
            { value: 4, label: 'Accent marks' },
            { value: 5, label: 'No obfuscation (retry only)' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            strategySelect.appendChild(option);
        });
        container.appendChild(strategySelect);

        const maxRetries = document.createElement('input');
        maxRetries.type = 'number';
        maxRetries.classList.add('cai-input');
        maxRetries.placeholder = 'Max retries (default 3)';
        maxRetries.value = GM_getValue('cai_fb_maxRetries', '3');
        maxRetries.style.marginTop = '4px';
        container.appendChild(maxRetries);

        const attemptsMap = new Map();

        const listener = (data) => {
            if (data?.command === 'filter_user_input' || data?.command === 'filter_user_input_self_harm') {
                const lastTurn = STATE.turns.find(t => t.author?.is_human);
                if (!lastTurn) {
                    status.textContent = 'Filter hit but no human turn found';
                    status.style.color = 'var(--cai-accent-amber)';
                    return;
                }

                const turnId = lastTurn.turn_key?.turn_id;
                const chatId = lastTurn.turn_key?.chat_id;
                const originalText = lastTurn.candidates?.[0]?.raw_content || '';

                let attempts = attemptsMap.get(turnId) || 0;
                const max = parseInt(maxRetries.value) || 3;
                const strategyIdx = parseInt(strategySelect.value) || 0;

                if (attempts >= max) {
                    status.textContent = `Max retries (${max}) reached for this message`;
                    status.style.color = 'var(--cai-accent-red)';
                    return;
                }

                attempts++;
                attemptsMap.set(turnId, attempts);

                status.textContent = `Filter triggered! Retry ${attempts}/${max}...`;
                status.style.color = 'var(--cai-accent-amber)';

                const obfuscated = FILTER_BYPASS_STRATEGIES[strategyIdx](originalText);

                // Small delay to let the filter settle
                setTimeout(() => {
                    if (STATE.currentCharacterId && chatId) {
                        sendMessage(obfuscated, { chatId, characterId: STATE.currentCharacterId });
                        status.textContent = `Sent obfuscated attempt ${attempts}`;
                        status.style.color = 'var(--cai-accent-green)';
                    }
                }, 300);
            }
        };

        STATE.chatListeners.push(listener);

        maxRetries.addEventListener('change', () => {
            GM_setValue('cai_fb_maxRetries', maxRetries.value);
        });

        return () => {
            const idx = STATE.chatListeners.indexOf(listener);
            if (idx >= 0) STATE.chatListeners.splice(idx, 1);
        };
    }
};
