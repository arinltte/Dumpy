/**
 * Universal Chat Exporter Popup Script
 */

const SUMMARY_PROMPT = `<!-- Chat Continuation Prompt -->
You are receiving a Markdown export of a previous chat session.

Read the exported conversation and internally reconstruct the context so the user can continue from where the previous session left off.

Internally identify:
- the user's goal,
- important decisions made,
- current progress,
- unresolved questions,
- pending tasks,
- relevant code, configuration, or content,
- and the most logical next step.

Do not display the summary unless the user explicitly asks for it.

Your first response should only be a short confirmation, such as:

"Previous chat session loaded. I have the necessary context to continue from where we left off. How would you like to proceed?"

---`;

let extractedData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const siteNameEl = document.getElementById("site-name");
  const detectStatusEl = document.getElementById("detect-status");
  const btnMarkdown = document.getElementById("btn-markdown");
  const btnJson = document.getElementById("btn-json");
  const activePanel = document.getElementById("active-panel");
  const unsupportedPanel = document.getElementById("unsupported-panel");
  const toggleTimestamp = document.getElementById("toggle-timestamp");
  const toggleSummaryPrompt = document.getElementById("toggle-summary-prompt");
  const themeToggle = document.getElementById("theme-toggle");

  try {
    // --- Theme Initializer & Logic ---
    chrome.storage.local.get(["theme"], (result) => {
      if (result.theme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
      } else {
        themeToggle.textContent = "🌙";
      }
    });

    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
      chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
    });

    // --- Tab Checking Logic ---
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      detectStatusEl.innerHTML = "<span style='color: #ef4444;'>Error: No active tab found</span>";
      return;
    }

    const urlStr = tab.url || "";
    let isSupported = false;
    let activeDomain = "";

    const checkDomains = [
      "chatgpt.com", 
      "gemini.google.com", 
      "aistudio.google.com",
      "claude.ai", 
      "chat.deepseek.com", 
      "perplexity.ai", 
      "kimi.com", 
      "kimi.moonshot.cn", 
      "kimi.ai",
      "chat.qwen.ai" 
    ];
    
    for (const domain of checkDomains) {
      if (urlStr.includes(domain)) {
        isSupported = true;
        activeDomain = domain;
        break;
      }
    }

    if (!isSupported) {
      activePanel.style.display = "none";
      unsupportedPanel.style.display = "block";
      return;
    }

    siteNameEl.textContent = activeDomain;
    detectStatusEl.textContent = "Connecting to page...";

    chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        detectStatusEl.innerHTML = "<span style='color: #ef4444;'>Not Ready</span>";
        detectStatusEl.title = "Please refresh the chat page once to inject the extension script.";
        return;
      }

      detectStatusEl.innerHTML = "<span style='color: #22c55e;'>Connected, Extracting...</span>";
      
      chrome.tabs.sendMessage(tab.id, { action: "extract" }, (extractRes) => {
        if (chrome.runtime.lastError || !extractRes || !extractRes.success) {
          detectStatusEl.innerHTML = "<span style='color: #ef4444;'>Failed parsing</span>";
          return;
        }

        extractedData = extractRes;
        const count = extractRes.conversation.length;
        detectStatusEl.innerHTML = `<span style="color: #22c55e;">Ready (${count} messages)</span>`;
        
        if (count > 0) {
          btnMarkdown.disabled = false;
          btnJson.disabled = false;
        } else {
          detectStatusEl.innerHTML = "<span style='color: #eab308;'>No dialogues detected</span>";
        }
      });
    });

    // --- Export Events ---
    btnMarkdown.addEventListener("click", () => {
      if (!extractedData) return;
      const includeTs = toggleTimestamp ? toggleTimestamp.checked : false;
      const includeSummary = toggleSummaryPrompt ? toggleSummaryPrompt.checked : false;
      const markdown = generateMarkdown(extractedData, includeTs, includeSummary);
      downloadFile(markdown, "chat-export.md", "text/markdown");
    });

    btnJson.addEventListener("click", () => {
      if (!extractedData) return;
      const includeTs = toggleTimestamp ? toggleTimestamp.checked : false;
      
      const cleanedPayload = {
        url: extractedData.url,
        exported_at: extractedData.exported_at,
        conversation: extractedData.conversation.map(turn => {
          const item = {
            index: turn.index,
            role: turn.role,
            content: turn.content
          };
          if (includeTs) item.timestamp = turn.timestamp;
          return item;
        })
      };

      downloadFile(JSON.stringify(cleanedPayload, null, 2), "chat-export.json", "application/json");
    });

  } catch (error) {
    detectStatusEl.innerHTML = `<span style='color: #ef4444;'>Script Error: ${error.message}</span>`;
  }
});

function generateMarkdown(data, includeTimestamp = false, includeSummary = false) {
  let md = "";
  if (includeSummary) {
    md += SUMMARY_PROMPT + "\n\n";
  }
  md += "# Conversation on " + data.domain + "\n\n";
  md += "*Exported on: " + new Date(data.exported_at).toLocaleString() + "*\n\n";
  md += "---\n\n";

  data.conversation.forEach(turn => {
    md += "### **" + (turn.role === "user" ? "User" : "Assistant") + "**";
    if (includeTimestamp && turn.timestamp) {
      md += " *" + new Date(turn.timestamp).toLocaleTimeString() + "*";
    }
    md += "\n\n" + turn.content + "\n\n";
    md += "---\n\n";
  });

  return md;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}