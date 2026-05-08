import { MODEL_TYPES } from '../../constants.js';
import { getAvailableModels } from '../../api/feature-limits.js';
import { updateChatModel } from '../../api/chat-data.js';
import { STATE } from '../../state.js';

export default {
    id: 'model-enforcer',
    title: 'Model Enforcer',
    description: 'Force a specific AI model for all chats',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.marginBottom = '6px';
        status.style.color = 'var(--cai-text-secondary)';
        status.textContent = 'Select a model to enforce';
        container.appendChild(status);

        const select = document.createElement('select');
        select.classList.add('cai-select');
        container.appendChild(select);

        const enforceBtn = document.createElement('button');
        enforceBtn.classList.add('cai-btn');
        enforceBtn.textContent = 'Apply to Current Chat';
        container.appendChild(enforceBtn);

        const autoLabel = document.createElement('label');
        autoLabel.style.display = 'flex';
        autoLabel.style.alignItems = 'center';
        autoLabel.style.gap = '6px';
        autoLabel.style.fontSize = '11px';
        autoLabel.style.color = 'var(--cai-text-secondary)';
        autoLabel.style.marginTop = '6px';
        autoLabel.style.cursor = 'pointer';
        const autoCb = document.createElement('input');
        autoCb.type = 'checkbox';
        autoCb.checked = GM_getValue('cai_model_auto', false);
        autoLabel.appendChild(autoCb);
        autoLabel.appendChild(document.createTextNode('Auto-apply on every chat load'));
        container.appendChild(autoLabel);

        let availableModels = [];

        async function loadModels() {
            try {
                const res = await getAvailableModels();
                if (res.status >= 200 && res.status < 300 && res.data) {
                    availableModels = res.data.available_models || [];
                    STATE.availableModels = availableModels;
                    STATE.defaultModelType = res.data.default_model_type;
                    select.innerHTML = '';
                    availableModels.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        const labelKey = Object.keys(MODEL_TYPES).find(k => MODEL_TYPES[k] === m) || m.replace('MODEL_TYPE_', '').toLowerCase();
                        opt.textContent = labelKey;
                        select.appendChild(opt);
                    });
                    const saved = GM_getValue('cai_model_enforced', '');
                    if (saved) select.value = saved;
                    status.textContent = `${availableModels.length} models available`;
                    status.style.color = 'var(--cai-accent-green)';
                } else {
                    status.textContent = 'Failed to load models';
                    status.style.color = 'var(--cai-accent-red)';
                }
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
                status.style.color = 'var(--cai-accent-red)';
            }
        }

        enforceBtn.addEventListener('click', async () => {
            if (!STATE.currentChatId) {
                status.textContent = 'No chat detected. Open a chat first.';
                status.style.color = 'var(--cai-accent-red)';
                return;
            }
            status.textContent = 'Applying...';
            status.style.color = 'var(--cai-text-secondary)';
            try {
                const res = await updateChatModel(STATE.currentChatId, select.value);
                if (res.status >= 200 && res.status < 300) {
                    status.textContent = `Set to ${select.options[select.selectedIndex].text}`;
                    status.style.color = 'var(--cai-accent-green)';
                } else {
                    status.textContent = 'Failed: ' + (res.data?.message || res.status);
                    status.style.color = 'var(--cai-accent-red)';
                }
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
                status.style.color = 'var(--cai-accent-red)';
            }
        });

        autoCb.addEventListener('change', () => {
            GM_setValue('cai_model_auto', autoCb.checked);
            if (autoCb.checked) {
                GM_setValue('cai_model_enforced', select.value);
            }
        });

        select.addEventListener('change', () => {
            if (autoCb.checked) {
                GM_setValue('cai_model_enforced', select.value);
            }
        });

        // Auto-apply on chat load
        let lastChatId = null;
        const autoApply = () => {
            if (!autoCb.checked) return;
            const enforced = GM_getValue('cai_model_enforced', '');
            if (!enforced || !STATE.currentChatId || STATE.currentChatId === lastChatId) return;
            lastChatId = STATE.currentChatId;
            updateChatModel(STATE.currentChatId, enforced).catch(() => {});
        };

        const chatObserver = setInterval(autoApply, 2000);
        loadModels();

        return () => {
            clearInterval(chatObserver);
        };
    }
};
