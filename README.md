# Dumpy

Dumpy is a lightweight Chrome extension (Manifest V3) that exports your chat history from popular
AI chat apps as clean **Markdown (`.md`)** or **JSON (`.json`)** files — ready to feed into another
model, archive, or share.

Everything runs locally in your browser. No data is uploaded or sent anywhere.

## Features

- Export a full conversation as Markdown or JSON with one click.
- Auto-detects the current platform and extracts user/assistant turns.
- Optional timestamps in the export.
- Optional **"Chat Continuation Prompt"** prepended to Markdown exports so you can hand the file to
  another AI and pick up where you left off.
- Light / dark theme in the popup.
- Resilient extraction that degrades gracefully if a site changes its layout.

## Supported platforms

| Platform           | URL pattern                                    |
| ------------------ | ---------------------------------------------- |
| ChatGPT            | `chatgpt.com`                                  |
| Google Gemini      | `gemini.google.com`                            |
| Google AI Studio   | `aistudio.google.com`                          |
| Anthropic Claude   | `claude.ai`                                    |
| DeepSeek           | `chat.deepseek.com`                            |
| Perplexity         | `perplexity.ai`                                |
| Kimi               | `kimi.com`, `kimi.moonshot.cn`, `kimi.ai`      |
| Qwen               | `chat.qwen.ai`                                 |

## Installation

> Dumpy is not (yet) available on the Chrome Web Store, so install it manually as an unpacked
> extension.

### Chrome

1. Download or clone this repository to a folder on your computer.
2. Open Chrome and go to **`chrome://extensions/`**.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the folder that contains this `README.md` file (`manifest.json`, `content.js`, etc.).

The Dumpy icon will appear in your toolbar. Pin it for easy access.

> **Note:** After manually updating the code, return to `chrome://extensions/` and click the
> refresh (↻) icon on the Dumpy card to reload it.

### Other Chromium browsers

The same "Load unpacked" flow works in Edge (`edge://extensions/`) and Brave
(`brave://extensions/`).

## Usage

1. Open a chat on any supported platform.
2. Click the Dumpy toolbar icon.
3. Confirm the popup shows **Detect Status: Ready (N messages)**.
4. (Optional) Toggle *Include Timestamps in Export* or *Include summary prompt at top*.
5. Click **Export as Markdown (.md)** or **Export as JSON (.json)**.

If a page was already open before installation, simply refresh it once so the content script can
load.

## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="center">
  <i>Developed by arinltte · cjshen00@gmail.com</i>
</p>

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).