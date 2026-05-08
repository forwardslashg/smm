export default {
    id: 'message-checker',
    title: 'Message Checker',
    description: 'Warns if your message contains filter-triggering words',
    author: 'Slash',
    defaultEnabled: true,
    code(api, container) {
        const prohibitedWords = ['sex', 'penis', 'vagina', 'cum', 'lets fuck', 'let\'s fuck', 'wanna fuck', 'horny', 'intimate activites', 'lets fck', 'let\'s fck', 'pussy', 'breast', 'boob'];

        let intervalId = setInterval(() => {
            if (!window.location.href.includes('/chat')) return;

            const textAreas = document.querySelectorAll('textarea');
            let found = false;
            let matchedWord = '';

            textAreas.forEach(userInput => {
                const userMessage = userInput.value.toLowerCase();
                const match = prohibitedWords.find(word => userMessage.includes(word));
                if (match) {
                    found = true;
                    matchedWord = match;
                }
            });

            let existingNotification = document.getElementById('cai-messageCheckerNotification');

            if (found) {
                if (!existingNotification) {
                    const notification = document.createElement('div');
                    notification.id = 'cai-messageCheckerNotification';
                    notification.classList.add('cai-notification');
                    notification.textContent = `I wouldn't say that, as it may trigger the filter: ${matchedWord}`;
                    document.body.appendChild(notification);
                } else {
                    existingNotification.textContent = `I wouldn't say that, as it may trigger the filter: ${matchedWord}`;
                }
            } else if (existingNotification && existingNotification.parentNode === document.body) {
                document.body.removeChild(existingNotification);
            }
        }, 500);

        return () => {
            clearInterval(intervalId);
            const existingNotification = document.getElementById('cai-messageCheckerNotification');
            if (existingNotification && existingNotification.parentNode === document.body) {
                document.body.removeChild(existingNotification);
            }
        };
    }
};
