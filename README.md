# Slash's Modmenu (SMM)

A powerful Tampermonkey userscript that enhances [character.ai](https://character.ai) with a comprehensive suite of features and quality-of-life improvements.

## Features

- **Model Switcher** - Easily switch between available character.ai models
- **Model Enforcer** - Enforce specific models for conversations
- **Auto-Regenerate** - Automatically regenerate responses based on custom criteria
- **Chat Manager** - Advanced chat organization and management tools
- **Chat Themes** - Apply custom visual themes to your chat interface
- **Message Checker** - Validate and inspect messages before sending
- **Tab Cloaker** - Hide your activity from tab titles and notifications
- **Response Length Control** - Set custom response length preferences
- **Usage Dashboard** - Track your token usage and API quotas
- **No Bloat** - Remove unnecessary UI elements and clutter
- **Filter Bypass** - Work around content filtering restrictions
- **And more!** - Extensible module system for easy feature additions

## Installation

### Prerequisites
- A browser with Tampermonkey or Greasemonkey extension installed
  - [Tampermonkey](https://www.tampermonkey.net/) (Recommended - Chrome, Firefox, Edge, Safari)
  - [Greasemonkey](https://www.greasespot.net/) (Firefox only)

[![Static Badge](https://img.shields.io/badge/click_to_install_userscript-stable-blue)](https://github.com/forwardslashg/smm/releases/download/rolling/modmenu.user.js)

### Installation Steps

1. Build the userscript:
   ```bash
   npm install
   npm run build
   ```

2. The build will generate both `dist/modmenu.user.js` and `dist/modmenu.meta.js`

3. Open `dist/modmenu.user.js` in your browser or visit `file:///path/to/dist/modmenu.user.js` and click "Install"

4. Navigate to [character.ai](https://character.ai) - the modmenu should automatically activate

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server with watch mode
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── index.js              # Main entry point and initialization
├── constants.js          # Global constants and configuration
├── state.js              # Application state management
├── utils.js              # Utility functions
├── hooks/                # Fetch/XHR/WebSocket interceptors
├── api/                  # character.ai API interface modules
│   ├── chat.js           # Chat API methods
│   ├── character.js      # Character API methods
│   ├── user.js           # User profile API
│   ├── image.js          # Image handling
│   ├── subscription.js   # Subscription management
│   └── ...
└── ui/                   # User interface components
    ├── modmenu.js        # Main modmenu framework
    ├── styles.js         # Global styles
    └── modules/          # Feature modules
        ├── model-switcher.js
        ├── chat-manager.js
        ├── (...)

```

### Build System

The project uses **esbuild** for fast bundling and minification. The build process:

1. Bundles all source files starting from `src/index.js`
2. Prepends metadata from `meta.txt` and injects rolling release `@downloadURL` and `@updateURL` headers
3. Outputs the final userscript to `dist/modmenu.user.js` and the update metadata to `dist/modmenu.meta.js`

### Creating New Modules

To add a new feature module:

1. Create a file in `src/ui/modules/your-module.js`
2. Export a default object with module configuration
3. Register it in `src/index.js` using `registerModule()`

Example:
```javascript
export default {
    name: 'Your Feature',
    enabled: true,
    init() {
        // Module initialization code
    },
    settings: {
        // Module-specific settings
    }
};
```

## Architecture

The modmenu uses an extensible module system with the following core components:

- **Hooks** - Intercepts fetch, XHR, and WebSocket calls to the character.ai API
- **API Layer** - Provides abstraction over character.ai's internal APIs
- **State Management** - Centralized state store for shared data
- **Module System** - Pluggable feature modules that can be enabled/disabled independently

## Configuration

Settings are stored in the browser using Tampermonkey's `GM_setValue` and `GM_getValue` APIs, persisting across browser sessions.

## Compatibility

- **Target**: character.ai website
- **Browser Support**: Any browser with Tampermonkey/Greasemonkey
- **ES Version**: ES2020

## Disclaimer

This userscript is provided as-is for educational purposes. Use responsibly and in accordance with character.ai's terms of service.
