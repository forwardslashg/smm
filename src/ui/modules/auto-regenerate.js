import { STATE } from '../../state.js';
import { regenerateMessage } from '../../api/chat.js';

export default {
    id: 'auto-regenerate',
    title: 'Auto Regenerate',
    description: 'Auto-regenerate when filter is triggered using the API',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.marginBottom = '4px';
        status.style.color = 'rgba(255,255,255,0.5)';
        status.textContent = 'Listening for filter events...';
        container.appendChild(status);

        let lastTurnId = null;

        const listener = (data) => {
            if (data?.command === 'filter_user_input' || data?.command === 'filter_user_input_self_harm') {
                status.textContent = 'Filter triggered! Auto-regenerating...';
                status.style.color = '#ffab40';

                if (lastTurnId && STATE.currentChatId && STATE.currentCharacterId) {
                    regenerateMessage(lastTurnId)
                        .then(() => {
                            status.textContent = 'Auto-regenerated';
                            status.style.color = '#69f0ae';
                        })
                        .catch(err => {
                            status.textContent = 'Regen failed: ' + err.message;
                            status.style.color = '#ff5252';
                        });
                } else {
                    status.textContent = 'Filter hit but no turn/chat known';
                    status.style.color = '#ff5252';
                }
            }

            if (data?.turn?.turn_key?.turn_id && !data.turn.author?.is_human) {
                lastTurnId = data.turn.turn_key.turn_id;
            }
        };

        STATE.chatListeners.push(listener);

        return () => {
            const idx = STATE.chatListeners.indexOf(listener);
            if (idx >= 0) STATE.chatListeners.splice(idx, 1);
        };
    }
};
