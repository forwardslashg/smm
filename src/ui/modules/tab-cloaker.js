export default {
    id: 'tab-cloaker',
    title: 'Tab Cloaker',
    description: 'I swear! I\'m just on google!',
    author: 'Slash',
    defaultEnabled: true,
    code(api, container) {
        let intervalId = setInterval(() => {
            document.title = 'Google';
            const linkElements = document.head.querySelectorAll('link[rel="icon"]');
            linkElements.forEach(linkElement => {
                linkElement.href = 'https://www.google.com/favicon.ico';
            });
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }
};
