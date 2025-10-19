# Noto - AI-Powered Universal Highlight Assistant

<div align="center">

**Your safe space for thoughts online.**

*Built for the Google Chrome Built-in AI Challenge 2025*

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Built with AI](https://img.shields.io/badge/Built%20with-Chrome%20AI-00D9FF?style=for-the-badge)](https://developer.chrome.com/docs/ai/built-in)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## Overview

**Noto** is an intelligent Chrome extension that transforms how you capture and interact with web content. Highlight important text across any website, add personal notes, and leverage **Chrome's Built-in AI** (Gemini Nano) to automatically summarize and enhance your highlights—all processed locally on your device for maximum privacy and speed.

### Key Features

- **Smart Highlighting** - Select and highlight text across any webpage
- **AI-Powered Summaries** - Get instant, concise summaries of your highlights using Chrome's Built-in Summarizer API
- **Intelligent Rewriting** - Refine your notes with Chrome's Built-in Rewriter API
- **AI Buddy Widget** - Floating assistant that provides contextual insights and quick summaries
- **Centralized Dashboard** - Organize, search, filter, and export all your highlights
- **100% Privacy-First** - All AI processing happens on-device with Gemini Nano
- **Offline-Capable** - Highlighting and note-taking work without an internet connection
- **Export Flexibility** - Export your highlights as JSON or CSV

---

## Chrome Built-in AI APIs Used

Noto leverages the following Chrome Built-in AI APIs:

| API | Purpose | Status |
|-----|---------|--------|
| **Summarizer API** | Generate concise summaries of highlighted text | ✅ Primary |
| **Rewriter API** | Enhance and refine user notes | ✅ Primary |
| **Prompt API** | Fallback for general AI operations | ✅ Fallback |

### Why Chrome Built-in AI?

- **🔒 Privacy**: All AI processing happens on your device—your highlights never leave your computer
- **⚡ Speed**: No network latency means instant AI responses
- **💰 Cost-Free**: No API keys, quotas, or usage limits
- **🌐 Offline**: Full AI functionality even without internet
- **🔋 Efficient**: Optimized for battery and resource usage

---

## Installation

### Prerequisites

To use Noto's AI features, you need:

1. **Chrome 127+** (or Chromium-based browser with AI support)
2. **Chrome Built-in AI Enabled**:
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to **"Enabled BypassPerfRequirement"**
   - Navigate to `chrome://flags/#summarization-api-for-gemini-nano`
   - Set to **"Enabled"**
   - Navigate to `chrome://flags/#rewriter-api-for-gemini-nano`
   - Set to **"Enabled"**
   - Restart Chrome
3. **Gemini Nano Model Downloaded**:
   - Open DevTools (F12) and run: `await ai.summarizer.create()`
   - Chrome will automatically download the Gemini Nano model (~1.5GB)

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/noto.git
cd noto

# Load the extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `noto-extension` folder
```

---

## Usage

### Highlighting Text

1. **Select text** on any webpage
2. A **toolbar** will appear with three options:
   - ✨ **Highlight** - Save the highlight only
   - 📝 **Add Note** - Add a personal note to the highlight
   - 🤖 **Summarize with AI** - Generate an AI summary using Chrome's Summarizer API

### AI Buddy Widget

Enable the AI Buddy in the extension popup to get:
- Real-time highlight count
- One-click page summarization
- Contextual tips and insights

### Dashboard

Access your dashboard via the extension popup or by clicking the extension icon:
- **Filter** by website, color, date, or search terms
- **Edit** notes inline
- **Summarize All** highlights at once
- **Export** as JSON or CSV

---

## Architecture

### Hybrid AI Strategy

Noto implements a hybrid approach for maximum compatibility:

```
Primary: Chrome Built-in AI (Gemini Nano)
    ↓
    ├─ Summarizer API → Text summarization
    ├─ Rewriter API → Note enhancement
    └─ Prompt API → General AI tasks

Fallback: OpenAI API (optional)
    └─ Used only if Chrome AI is unavailable
```

### Technical Stack

- **Manifest V3** - Modern Chrome extension architecture
- **Chrome Built-in AI APIs** - Summarizer, Rewriter, Prompt
- **Vanilla JavaScript** - No framework dependencies
- **Chrome Storage API** - Local data persistence
- **XPath Serialization** - Robust highlight restoration

---

## Chrome Built-in AI Challenge 2025

This project was built for the **Google Chrome Built-in AI Challenge 2025** and showcases:

1. **Multiple API Integration**: Uses Summarizer, Rewriter, and Prompt APIs
2. **On-Device AI**: 100% local processing with Gemini Nano
3. **Practical Application**: Solves real-world content capture and organization problems
4. **Privacy-First Design**: No data ever leaves the user's device
5. **Hybrid Fallback**: Gracefully degrades to OpenAI if Chrome AI unavailable

### Problem Solved

Noto addresses the challenge of **information overload** on the web by providing:
- Intelligent content capture across any website
- AI-powered summarization to distill key insights
- Organized knowledge management without vendor lock-in
- Privacy-respecting AI that works offline

---

## Development

### Project Structure

```
noto-extension/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (AI API orchestration)
├── content/
│   ├── contentScript.js   # Main coordinator
│   ├── highlighter.js     # DOM manipulation
│   ├── toolbar.js         # Selection toolbar
│   ├── aiBuddy.js        # Floating widget
│   └── styles.css        # Content styles
├── popup/
│   ├── popup.html        # Extension popup
│   ├── popup.js          # Popup logic + AI status
│   └── popup.css         # Popup styles
├── dashboard/
│   ├── index.html        # Dashboard UI
│   ├── dashboard.js      # Dashboard logic
│   └── dashboard.css     # Dashboard styles
└── utils/
    ├── ai.js            # AI API wrapper
    ├── storage.js       # Storage utilities
    └── helpers.js       # Helper functions
```

### Testing Chrome AI Locally

```javascript
// Open DevTools Console on any page

// Check Summarizer API
const canSummarize = await ai.summarizer.capabilities();
console.log("Summarizer:", canSummarize);

const summarizer = await ai.summarizer.create();
const summary = await summarizer.summarize("Your text here...");
console.log("Summary:", summary);

// Check Rewriter API
const canRewrite = await ai.rewriter.capabilities();
console.log("Rewriter:", canRewrite);

const rewriter = await ai.rewriter.create();
const rewritten = await rewriter.rewrite("Your text here...");
console.log("Rewritten:", rewritten);
```

---

## Roadmap

- [ ] Multi-device sync via Chrome Sync Storage
- [ ] Advanced search with regex support
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Context menu integration
- [ ] Collaborative highlight sharing
- [ ] Writer API integration for content generation
- [ ] Translator API for multilingual highlights
- [ ] Export to Notion, Obsidian, Roam Research

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

- Built with [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in)
- Powered by [Gemini Nano](https://deepmind.google/technologies/gemini/nano/)
- Created for the [Google Chrome Built-in AI Challenge 2025](https://googlechromeai.devpost.com/)

---

<div align="center">

**Made with ❤️ for the Chrome Built-in AI Challenge 2025**

[Report Bug](https://github.com/yourusername/noto/issues) · [Request Feature](https://github.com/yourusername/noto/issues)

</div>
