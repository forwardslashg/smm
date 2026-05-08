import { MODEL_TYPES } from '../../constants.js';
import { updateChatModel } from '../../api/chat-data.js';
import { STATE } from '../../state.js';

export default {
    id: 'model-switcher',
    title: 'Model Switcher',
    description: 'Switch between AI model types',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const select = document.createElement('select');
        select.classList.add('cai-select');
        Object.entries(MODEL_TYPES).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = key;
            select.appendChild(option);
        });
        container.appendChild(select);

        const btn = document.createElement('button');
        btn.classList.add('cai-btn');
        btn.textContent = 'Set Model';
        container.appendChild(btn);

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.marginTop = '4px';
        status.style.color = 'rgba(255,255,255,0.5)';
        container.appendChild(status);

        btn.addEventListener('click', async () => {
            if (!STATE.currentChatId) {
                status.textContent = 'No chat detected. Open a chat first.';
                status.style.color = '#ff5252';
                return;
            }
            status.textContent = 'Setting...';
            status.style.color = 'rgba(255,255,255,0.6)';
            try {
                const res = await updateChatModel(STATE.currentChatId, select.value);
                if (res.status >= 200 && res.status < 300) {
                    status.textContent = `Set to ${select.options[select.selectedIndex].text}`;
                    status.style.color = '#69f0ae';
                } else {
                    status.textContent = 'Failed: ' + (res.data?.message || res.status);
                    status.style.color = '#ff5252';
                }
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
                status.style.color = '#ff5252';
            }
        });
    }
};
