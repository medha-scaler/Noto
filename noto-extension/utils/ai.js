async function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      if (!response) {
        reject(new Error("No response from background script."));
        return;
      }

      if (response.ok) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || "Unknown error."));
      }
    });
  });
}

export async function summarizeText(selectedText) {
  return sendMessage("noto:ai:summarize", { text: selectedText });
}

export async function rewriteText(noteText) {
  return sendMessage("noto:ai:rewrite", { text: noteText });
}

export async function getAllHighlights() {
  return sendMessage("noto:storage:getAll");
}

export async function updateHighlight(id, updates) {
  return sendMessage("noto:storage:update", { id, updates });
}

export async function removeHighlight(id) {
  return sendMessage("noto:storage:remove", { id });
}

export async function checkAIAvailability() {
  return sendMessage("noto:ai:checkAvailability");
}

export async function reinitializeAI() {
  return sendMessage("noto:ai:reinitialize");
}
