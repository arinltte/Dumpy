# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-08-30

### Added
- First public release.
- Manual "Load unpacked" install support for Chrome, Edge, and Brave.
- README with intro, supported-platform list, installation, and usage docs.

### Fixed
- Kimi (`www.kimi.ai`) chat extraction — content script now injected on `www.kimi.ai`.
- Perplexity chat extraction — removed invalid slash-class selectors and the leaked timestamp turn.

### Changed
- Replaced the summary prompt with the Chat Continuation Prompt.
- Added resilient, fallback-based extraction to survive site layout changes.
- Version set to `0.1.0`.