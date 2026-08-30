/**
 * Universal Chat Exporter Background Worker
 * Handles lifecycle triggers and setups
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Universal Chat Exporter extension successfully installed.");
});
