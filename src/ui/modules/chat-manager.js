import { archiveChat, unarchiveChat, renameChat, copyChat, resurrectChat } from '../../api/chat-data.js';
import { STATE } from '../../state.js';

export default {
    id: 'chat-manager',
    title: 'Chat Manager',
    description: 'Archive, rename, copy, or resurrect chats',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.marginBottom = '4px';
        status.style.color = 'rgba(255,255,255,0.5)';
        status.textContent = 'Requires open chat';
        container.appendChild(status);

        const makeBtn = (label, action) => {
            const btn = document.createElement('button');
            btn.classList.add('cai-btn');
            btn.textContent = label;
            btn.addEventListener('click', async () => {
                if (!STATE.currentChatId) {
                    status.textContent = 'No chat detected. Open a chat first.';
                    status.style.color = '#ff5252';
                    return;
                }
                status.textContent = 'Working...';
                status.style.color = 'rgba(255,255,255,0.6)';
                try {
                    const res = await action();
                    if (res.status >= 200 && res.status < 300) {
                        status.textContent = `${label} done`;
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
            return btn;
        };

        container.appendChild(makeBtn('Archive', () => archiveChat(STATE.currentChatId)));
        container.appendChild(makeBtn('Unarchive', () => unarchiveChat(STATE.currentChatId)));

        const renameBtn = document.createElement('button');
        renameBtn.classList.add('cai-btn');
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', async () => {
            if (!STATE.currentChatId) {
                status.textContent = 'No chat detected. Open a chat first.';
                status.style.color = '#ff5252';
                return;
            }
            const name = prompt('New chat name:');
            if (!name) return;
            status.textContent = 'Renaming...';
            status.style.color = 'rgba(255,255,255,0.6)';
            try {
                const res = await renameChat(STATE.currentChatId, name);
                if (res.status >= 200 && res.status < 300) {
                    status.textContent = 'Renamed';
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
        container.appendChild(renameBtn);

        container.appendChild(makeBtn('Resurrect', () => resurrectChat(STATE.currentChatId)));

        const copyBtn = document.createElement('button');
        copyBtn.classList.add('cai-btn');
        copyBtn.textContent = 'Copy Chat';
        copyBtn.addEventListener('click', async () => {
            if (!STATE.currentChatId) {
                status.textContent = 'No chat detected. Open a chat first.';
                status.style.color = '#ff5252';
                return;
            }
            const endTurnId = prompt('End turn ID (optional):') || undefined;
            status.textContent = 'Copying...';
            status.style.color = 'rgba(255,255,255,0.6)';
            try {
                const res = await copyChat(STATE.currentChatId, endTurnId);
                if (res.status >= 200 && res.status < 300) {
                    status.textContent = 'Copied. See console for new chat ID.';
                    status.style.color = '#69f0ae';
                    console.log('[CAI-MOD] Copy result:', res.data);
                } else {
                    status.textContent = 'Failed: ' + (res.data?.message || res.status);
                    status.style.color = '#ff5252';
                }
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
                status.style.color = '#ff5252';
            }
        });
        container.appendChild(copyBtn);
    }
};
