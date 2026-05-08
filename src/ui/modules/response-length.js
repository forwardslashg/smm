import { updateChatResponseLength } from '../../api/chat-data.js';
import { STATE } from '../../state.js';

export default {
    id: 'response-length',
    title: 'Response Length',
    description: 'Adjust AI response length',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const select = document.createElement('select');
        select.classList.add('cai-select');
        const options = [
            { value: 'SHORT', label: 'Short' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LONG', label: 'Long' }
        ];
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
        container.appendChild(select);

        const btn = document.createElement('button');
        btn.classList.add('cai-btn');
        btn.textContent = 'Set Length';
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
                const res = await updateChatResponseLength(STATE.currentChatId, select.value);
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
