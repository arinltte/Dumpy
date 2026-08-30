/**
 * Universal Chat Exporter Content Script
 * Safely extracts message structures across 8 different LLM platforms
 */

const PLATFORM_CONFIGS = {
  "chatgpt.com": {
    name: "ChatGPT",
    turnSelector: "[data-message-role]",
    role: el => el.getAttribute("data-message-role") || "unknown",
    userContent: ["[data-user-message-copy]"],
    assistantContent: ["[data-assistant-markdown]"]
  },
  "gemini.google.com": {
    name: "Google Gemini",
    turnSelector: "user-query, model-response",
    role: el => el.tagName.toLowerCase() === "user-query" ? "user" : "assistant",
    userContent: [".query-text"],
    assistantContent: ["message-content .markdown"]
  },
  "aistudio.google.com": {
    name: "Google AI Studio",
    turnSelector: ".turn-content",
    role: el => {
      const label = el.querySelector(".author-label");
      if (label && label.textContent.toLowerCase().includes("user")) return "user";
      if (label && label.textContent.toLowerCase().includes("model")) return "assistant";
      return "unknown";
    },
    userContent: ["ms-prompt-chunk, ms-text-chunk"],
    assistantContent: ["ms-prompt-chunk, ms-text-chunk"]
  },
  "claude.ai": {
    name: "Anthropic Claude",
    turnSelector: "[data-testid='transcript-row']",
    role: el => el.getAttribute("data-perf-row") === "human" ? "user" : "assistant",
    userContent: ["[data-testid='user-message']"],
    assistantContent: [".standard-markdown"]
  },
  "perplexity.ai": {
    name: "Perplexity",
    turnSelector: "[class~='group/user-bubble'], [data-workflow-final-text]",
    role: el => el.classList.contains("group/user-bubble") ? "user" : "assistant",
    userContent: [".select-text.break-words", "[data-renderer='lm']", ".prose"],
    assistantContent: [".prose", "[data-renderer='lm']"]
  },
  "chat.deepseek.com": {
    name: "DeepSeek",
    turnSelector: ".ds-message",
    role: el => el.querySelector(".ds-markdown") ? "assistant" : "user",
    userContent: [""],
    assistantContent: [".ds-markdown"]
  },
  "kimi.com": {
    name: "Kimi",
    turnSelector: ".chat-content-item-user, .chat-content-item-assistant",
    role: el => el.classList.contains("chat-content-item-user") ? "user" : "assistant",
    userContent: [".user-content__text"],
    assistantContent: [".markdown-container .markdown", ".markdown .paragraph"]
  },
  "kimi.moonshot.cn": {
    name: "Kimi",
    turnSelector: ".chat-content-item-user, .chat-content-item-assistant",
    role: el => el.classList.contains("chat-content-item-user") ? "user" : "assistant",
    userContent: [".user-content__text"],
    assistantContent: [".markdown-container .markdown", ".markdown .paragraph"]
  },
  "kimi.ai": {
    name: "Kimi",
    turnSelector: ".chat-content-item-user, .chat-content-item-assistant",
    role: el => el.classList.contains("chat-content-item-user") ? "user" : "assistant",
    userContent: [".user-content__text"],
    assistantContent: [".markdown-container .markdown", ".markdown .paragraph"]
  },
  "chat.qwen.ai": {
    name: "Qwen",
    turnSelector: ".qwen-chat-message",
    role: el => el.classList.contains("qwen-chat-message-user") ? "user" : "assistant",
    userContent: [".user-message-content"],
    assistantContent: [".qwen-markdown"]
  }
};

function getCurrentPlatformConfig() {
  const host = window.location.host;
  for (const domain of Object.keys(PLATFORM_CONFIGS)) {
    if (host.includes(domain)) return { domain, ...PLATFORM_CONFIGS[domain] };
  }
  return null;
}

function extractMarkdown(node) {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase();
  
  // Universally strip interactive UI noises (Buttons, Screen Readers, etc.)
  if (
    tag === 'button' || 
    tag === 'svg' || 
    node.getAttribute('role') === 'button' ||
    (node.style && node.style.display === 'none')
  ) return "";

  if (node.classList) {
    const classStr = node.className.toString();
    if (
      classStr.includes('cdk-visually-hidden') ||
      classStr.includes('screen-reader') ||
      classStr.includes('visually-hidden') ||
      classStr.includes('sr-only') ||
      classStr.includes('srOnly') ||
      classStr.includes('tooltip') ||
      classStr.includes('action-item') ||
      classStr.includes('icon-button') ||
      classStr.includes('title-icon') ||
      classStr.includes('toolcall') ||
      classStr.includes('thinking') ||
      classStr.includes('upgrade') ||
      classStr.includes('membership')
    ) return "";
  }

  // Code Block Extractors 
  if (tag === 'pre') {
     let codeNode = node.querySelector('code');
     let lang = "";
     
     if (codeNode && codeNode.className) {
       const match = codeNode.className.match(/language-(\w+)/);
       if (match) lang = match[1];
     }
     
     // Deep search parent tree to extract language headers across platforms
     if (!lang) {
        let container = node.parentNode;
        for (let i = 0; i < 6 && container; i++) {
            const langEl = container.querySelector('.code-block-decoration span, [data-testid="code-language-indicator"], .segment-code-lang, .qwen-markdown-code-header > div:first-child, .text-text-500.font-small, .d813de27, .flex.justify-between, .title-text');
            if (langEl && langEl.textContent) {
                lang = langEl.textContent.replace(/Copy( code)?/i, '').trim();
                const matchLang = lang.match(/^([a-zA-Z0-9+#]+)/);
                if (matchLang) lang = matchLang[1].toLowerCase();
                break;
            }
            container = container.parentNode;
        }
     }
     
     let codeText = "";
     
     // Qwen Monaco Editor detection (Bypasses .line-numbers extraction)
     const viewLines = node.querySelector('.view-lines');
     if (viewLines) {
       const lines = viewLines.querySelectorAll('.view-line');
       codeText = Array.from(lines).map(line => line.textContent).join('\n');
     } else if (codeNode) {
       codeText = codeNode.innerText || codeNode.textContent;
     } else {
       codeText = node.innerText || node.textContent;
     }
     
     const splitStr = "\nCopy code\n";
     if (codeText.includes(splitStr)) codeText = codeText.split(splitStr)[1];
     
     return "\n\n```" + (lang.toLowerCase() || "") + "\n" + codeText.trim() + "\n```\n\n";
  }

  if (tag === 'code') return "`" + node.textContent.trim() + "`";

  let children = "";
  for (const child of node.childNodes) {
    children += extractMarkdown(child);
  }

  switch (tag) {
    case 'p': return children.trim() + "\n\n";
    case 'br': return "\n";
    case 'strong':
    case 'b': return "**" + children.trim() + "**";
    case 'em':
    case 'i': return "*" + children.trim() + "*";
    case 'h1': return "\n# " + children.trim() + "\n\n";
    case 'h2': return "\n## " + children.trim() + "\n\n";
    case 'h3': return "\n### " + children.trim() + "\n\n";
    case 'h4': return "\n#### " + children.trim() + "\n\n";
    case 'ul': 
    case 'ol': 
       return "\n" + children + "\n";
    case 'li': {
       let isOl = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol';
       let prefix = "- ";
       if (isOl) {
          let index = 1;
          for (const sibling of node.parentNode.children) {
             if (sibling === node) break;
             if (sibling.tagName.toLowerCase() === 'li') index++;
          }
          prefix = index + ". ";
       }
       let content = children.trim().replace(/\n{2,}/g, '\n    '); 
       return prefix + content + "\n";
    }
    case 'div':
    case 'span':
       if (node.classList) {
          const classStr = node.className.toString();
          if (classStr.includes('title')) return "**" + children.trim() + "**\n";
          if (classStr.includes('row-text')) return children.trim() + " ";
          if (classStr.includes('paragraph')) return children.trim() + "\n\n";
       }
       return children;
    default:
       return children;
  }
}

function normalizeList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * querySelectorAll that never throws: on an invalid selector it retries with
 * non-identifier characters (e.g. `/` in Tailwind `group/user-bubble`) escaped.
 */
function safeQuerySelectorAll(root, selector) {
  if (!selector) return [];
  try {
    return root.querySelectorAll(selector);
  } catch (e) {
    return fallbackQuerySelectorAll(root, selector);
  }
}

function fallbackQuerySelectorAll(root, selector) {
  const results = [];
  const parts = String(selector).split(",");
  for (const part of parts) {
    const escaped = part.trim().replace(/\.([^.\s,>+~]+)/g, (m, cls) => {
      return "." + cls.replace(/([^A-Za-z0-9_-])/g, (c) => "\\" + c);
    });
    try {
      for (const n of root.querySelectorAll(escaped)) results.push(n);
    } catch (e2) {
      // ignore this variant
    }
  }
  return results;
}

const USER_TOKENS = ["user", "human", "query", "question", "bubble", "prompt"];
const ASSISTANT_TOKENS = ["assistant", "model", "bot", "answer", "response", "final-text", "finaltext", "prose", "markdown", "agent"];

function classifyRole(el) {
  const cls = String(el.className || "") + " " +
    (el.getAttribute("data-message-role") || "") + " " +
    (el.getAttribute("data-perf-row") || "") + " " +
    (el.getAttribute("data-testid") || "") + " " +
    (el.hasAttribute("data-workflow-final-text") ? "final-text" : "");
  const lower = cls.toLowerCase();
  for (const t of USER_TOKENS) { if (lower.indexOf(t) !== -1) return "user"; }
  for (const t of ASSISTANT_TOKENS) { if (lower.indexOf(t) !== -1) return "assistant"; }
  return null;
}

/**
 * Last-resort extractor: when the platform config is missing or yields nothing,
 * scan for elements whose class / data-* attributes hint a user vs assistant role.
 * Keeps the outermost matching container of each role and strips UI noise via
 * extractMarkdown, so a DOM rewrite degrades gracefully instead of failing.
 */
function heuristicExtractConversation() {
  const selector = [
    "[data-message-role]",
    "[data-perf-row]",
    "[data-workflow-final-text]",
    "[data-testid*='message']",
    "[class*='user']",
    "[class*='human']",
    "[class*='assistant']",
    "[class*='model']",
    "[class*='bot']",
    "[class*='bubble']",
    "[class*='query']",
    "[class*='response']",
    "[class*='final-text']",
    "[class*='markdown']"
  ].join(", ");

  let candidates;
  try {
    candidates = Array.from(document.querySelectorAll(selector));
  } catch (e) {
    return [];
  }

  const kept = [];
  const turns = [];
  for (const el of candidates) {
    const role = classifyRole(el);
    if (!role) continue;

    // Skip nested duplicates: if an already-kept ancestor covers this node.
    let covered = false;
    for (const k of kept) {
      if (k.contains(el)) { covered = true; break; }
    }
    if (covered) continue;

    const textContent = extractMarkdown(el).trim()
      .replace(/\bCopy\b$|\bShare\b$|\bRegenerate\b$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!textContent) continue;

    kept.push(el);
    turns.push({
      index: turns.length,
      role,
      content: textContent,
      timestamp: new Date().toISOString()
    });
  }
  return turns;
}

function extractConversation() {
  const config = getCurrentPlatformConfig();
  if (!config) return heuristicExtractConversation();

  const turns = extractWithConfig(config);
  if (turns.length === 0) return heuristicExtractConversation();
  return turns;
}

function extractWithConfig(config) {
  const turnSelectors = normalizeList(config.turnSelector);
  let turnElements = [];
  for (const sel of turnSelectors) {
    if (!sel) continue;
    const els = safeQuerySelectorAll(document, sel);
    if (els && els.length) {
      turnElements = Array.from(els);
      break;
    }
  }

  const turns = [];
  turnElements.forEach((el, index) => {
    let role = config.role(el);
    if (!role || role === "unknown") return;

    let contentEl = el;
    const selectorList = role === "user" ? config.userContent : config.assistantContent;
    const list = normalizeList(selectorList);
    if (list.length) {
      contentEl = pickBestMatch(el, list) || el;
    }

    let textContent = extractMarkdown(contentEl).trim();

    if (textContent) {
      textContent = textContent.replace(/\bCopy\b$|\bShare\b$|\bRegenerate\b$/g, "").trim();
      textContent = textContent.replace(/\n{3,}/g, '\n\n');

      turns.push({
        index,
        role,
        content: textContent,
        timestamp: new Date().toISOString()
      });
    }
  });

  return turns;
}

/**
 * Try each selector in the list, return the first match with non-empty text.
 * Falls back to the element with the longest text when multiple match.
 */
function pickBestMatch(root, selectors) {
  if (!Array.isArray(selectors)) selectors = [selectors];
  let best = null;
  let bestLen = 0;
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const matches = safeQuerySelectorAll(root, sel);
      for (const m of matches) {
        const len = (m.textContent || "").trim().length;
        if (len > bestLen) {
          bestLen = len;
          best = m;
        }
      }
    } catch (e) {
      // ignore invalid selector
    }
  }
  return best;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "ping") {
      sendResponse({ status: "alive", domain: window.location.host, config: getCurrentPlatformConfig() });
    } else if (request.action === "extract") {
      const data = extractConversation();
      sendResponse({
        success: true,
        url: window.location.href,
        domain: window.location.host,
        exported_at: new Date().toISOString(),
        conversation: data
      });
    } else {
      sendResponse({ success: false, error: "Unknown action: " + request.action });
    }
  } catch (err) {
    sendResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
  return true;
});