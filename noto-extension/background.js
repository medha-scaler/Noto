const DEFAULT_SETTINGS = {
  highlightColor: "#fadc4d",
  aiBuddyEnabled: true,
  apiKey: "",
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const updates = {};

  Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
    if (typeof stored[key] === "undefined") {
      updates[key] = value;
    }
  });

  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message || {};

  if (type === "noto:openDashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
    sendResponse({ ok: true });
    return;
  }

  if (type === "noto:ai:summarize") {
    handleSummarize(payload, sendResponse);
    return true;
  }

  if (type === "noto:ai:rewrite") {
    handleRewrite(payload, sendResponse);
    return true;
  }

  if (type === "noto:storage:getAll") {
    handleGetAll(sendResponse);
    return true;
  }

  if (type === "noto:storage:update") {
    handleUpdateHighlight(payload, sendResponse);
    return true;
  }

  if (type === "noto:storage:remove") {
    handleRemoveHighlight(payload, sendResponse);
    return true;
  }

  return false;
});

async function fetchApiKey() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  return apiKey;
}

async function handleSummarize(payload, sendResponse) {
  try {
    const summary = await requestCompletionsApi({
      prompt: payload?.text || "",
      systemPrompt:
        "You are Noto, an assistant that creates crisp summaries of highlighted web content. Focus on the user-selected text only.",
    });
    sendResponse({ ok: true, data: summary });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to summarize text.",
    });
  }
}

async function handleRewrite(payload, sendResponse) {
  try {
    const rewritten = await requestCompletionsApi({
      prompt: payload?.text || "",
      systemPrompt:
        "Rewrite the user note in a concise, friendly tone. Keep the meaning intact.",
    });
    sendResponse({ ok: true, data: rewritten });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to rewrite note.",
    });
  }
}

async function handleGetAll(sendResponse) {
  try {
    const { highlights = {} } = await chrome.storage.local.get("highlights");
    sendResponse({ ok: true, data: highlights });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to load highlights.",
    });
  }
}

async function handleUpdateHighlight(payload, sendResponse) {
  try {
    const { highlights = {} } = await chrome.storage.local.get("highlights");
    const { id, updates = {} } = payload || {};
    if (!id || !highlights[id]) {
      throw new Error("Highlight not found.");
    }

    highlights[id] = { ...highlights[id], ...updates, updatedAt: Date.now() };
    await chrome.storage.local.set({ highlights });
    sendResponse({ ok: true, data: highlights[id] });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to update highlight.",
    });
  }
}

async function handleRemoveHighlight(payload, sendResponse) {
  try {
    const { highlights = {} } = await chrome.storage.local.get("highlights");
    const { id } = payload || {};
    if (!id || !highlights[id]) {
      throw new Error("Highlight not found.");
    }

    delete highlights[id];
    await chrome.storage.local.set({ highlights });
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to delete highlight.",
    });
  }
}

async function requestCompletionsApi({ prompt, systemPrompt }) {
  const apiKey = await fetchApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing API key. Please add it through the Noto popup settings."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 250,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`API error: ${errorPayload}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}
