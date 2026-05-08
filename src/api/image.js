import { neoRequest } from './client.js';

export async function generateImage(prompt, options = {}) {
    return neoRequest('POST', '/multimodal/api/v1/media/generation/generateImage', { prompt, ...options });
}

export async function imagineChat(chatId, prompt) {
    return neoRequest('POST', '/image/in_chat_imagine', { chat_id: chatId, prompt });
}
