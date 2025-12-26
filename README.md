# Ghost In The Chrome

A Chrome extension that displays scroll history and bookmarks with a transparent GUI

## Overview

Ghost In The Chrome is a Chrome extension that displays a transparent interface on the right side of the browser, allowing quick access to bookmarks and history through mouse wheel scrolling operations.

## Features

### All Features Available (Free)
- **Transparent GUI**: Displays a transparent interface on the right side of the screen
- **Bookmark Display**: Shows bookmarks with downward wheel scroll
- **History Display**: Shows history with upward wheel scroll (up to 1000 items)
- **Position Display**: Shows percentage based on mouse position
- **Ghost Mode**: Switch between Normal/Stealth/Disabled modes
- **Favorites Feature**: Add and manage bookmarks as favorites
- **Custom History**: Customize history display count from 150-1000 items
- **Advanced Search**: Advanced search functionality for history and bookmarks

## Installation

### Development Version (Local Installation)

1. Clone this repository
```bash
git clone https://github.com/ogiharadevelopment/GhostInTheChrome.git
cd GhostInTheChrome
```

2. Load extension in Chrome
   - Open `chrome://extensions/` in Chrome
   - Enable "Developer mode"
   - Click "Load unpacked extension"
   - Select the `GhostInTheChrome` folder

### Production Version (Chrome Web Store)

1. Install from Chrome Web Store
   - [Chrome Web Storeでインストール](https://chrome.google.com/webstore/detail/jefkcnkbaiiogdilpmmnnkooniginagd)
   - Click "Add" button

**Extension ID**: `jefkcnkbaiiogdilpmmnnkooniginagd`

> **Note**: このリポジトリは、Chrome Web Storeで公開されている「Ghost In The Chrome」拡張機能のソースコードです。

## Usage

### Basic Operations

1. **Display Interface**
   - Move mouse to the right side of the browser
   - Transparent ghost mark will appear

2. **Show Bookmarks**
   - Downward wheel scroll in the ghost area
   - Bookmark list will be displayed

3. **Show History**
   - Upward wheel scroll in the ghost area
   - History list will be displayed

4. **Switch Ghost Mode**
   - Press Ctrl key in the ghost area
   - Switches in order: Normal → Stealth → Disabled

### Advanced Features

1. **Favorites Feature**
   - Shift + downward wheel scroll to show favorites list
   - Add bookmarks to favorites with the ☆ button next to bookmarks

2. **Custom History**
   - Select display count with dropdown when showing history
   - Configurable range from 150 to 1000 items

## Technical Specifications

### Supported Environment
- **Chrome**: 88.0 or higher
- **Manifest**: V3
- **Permissions**: activeTab, storage, bookmarks, history, sessions

### Architecture
- **Content Script**: Transparent GUI and user interaction
- **Background Script**: History/bookmark retrieval, session handling
- **Popup**: Settings screen
- **Options**: Detailed settings

### Security
- **Encryption**: Protects sensitive information with AES-GCM encryption
- **Rate Limiting**: Limits API calls
- **Local Storage**: Stores all data locally

## Development

### Setup

1. Clone repository
```bash
git clone https://github.com/ogiharadevelopment/GhostInTheChrome.git
cd GhostInTheChrome
```

2. Optional: enable debug logging in `content/content.js` if necessary

3. Load extension in Chrome
   - Enable developer mode in `chrome://extensions/`
   - Load folder

### File Structure

```
GhostInTheChrome/
├── manifest.json          # Extension settings
├── _locales/              # Localization files
│   ├── en/               # English messages
│   └── ja/               # Japanese messages
├── content/               # Content script
│   ├── content.js        # Main logic
│   └── content.css       # Styles
├── background/            # Background script
│   └── background.js     # History/bookmark retrieval
├── popup/                 # Popup screen
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/               # Settings screen
│   ├── options.html
│   ├── options.js
│   └── options.css
├── config/                # Settings files
│   └── beta-config.js    # Beta test settings
├── icons/                 # Icon files
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── docs/                  # Documentation
├── README.md              # Project description
├── STORE_DESCRIPTION.md  # Chrome Web Store description
└── PRIVACY_POLICY.md     # Privacy Policy/Terms of Use
```

### Build/Deployment

1. **Development Version Test**
   - Load extension locally
   - Run feature tests

2. **Production Version Preparation**
   - Disable development mode
   - Remove beta test features
   - Review privacy policy

3. **Chrome Web Store Application**
   - Create ZIP file
   - Apply in Chrome Web Store Developer Dashboard

## Localization

This extension supports multiple languages through Chrome's localization system:

- **English (en)**: Default language
- **Japanese (ja)**: Full Japanese support

The extension automatically detects the user's browser language and displays appropriate text.

## License

This project is open source under the MIT license.

## Contributing

Bug reports and feature requests are welcome at [Issues](https://github.com/ogiharadevelopment/GhostInTheChrome/issues).

Pull requests are also welcome.

## Update History

### v1.0.0 (July 30, 2025)
- Initial release
- All features available for free
- Transparent GUI interface
- Bookmark and history management
- Ghost mode functionality
- Multi-language support (English/Japanese)

## Contact

- **GitHub Issues**: [Issues](https://github.com/ogiharadevelopment/GhostInTheChrome/issues)
- **Email**: Developer contact (refer to GitHub profile)

---

**Last Updated**: July 30, 2025  
**Version**: 1.0.0 