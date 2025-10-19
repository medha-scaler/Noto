const DEFAULT_SETTINGS = {
  highlightColor: "#fadc4d",
  aiBuddyEnabled: true,
  aiMode: "chrome", // "chrome" for Built-in AI, "openai" for fallback
  apiKey: "", // Only needed for OpenAI fallback
};

// Chrome Built-in AI session managers
let summarizerSession = null;
let rewriterSession = null;
let promptSession = null;

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

  // Initialize Chrome AI APIs
  await initializeChromeAI();
});

// Initialize Chrome Built-in AI sessions
async function initializeChromeAI() {
  try {
    // Check if Chrome AI APIs are available
    if (typeof ai === "undefined") {
      console.warn("Chrome Built-in AI not available. Will use fallback.");
      await chrome.storage.local.set({ aiMode: "openai" });
      return;
    }

    // Initialize Summarizer API
    if (ai.summarizer) {
      const canSummarize = await ai.summarizer.capabilities();
      if (canSummarize && canSummarize.available !== "no") {
        if (canSummarize.available === "readily") {
          summarizerSession = await ai.summarizer.create({
            type: "key-points",
            format: "plain-text",
            length: "medium",
          });
          console.log("✅ Summarizer API initialized");
        } else {
          // Download model if needed
          summarizerSession = await ai.summarizer.create({
            type: "key-points",
            format: "plain-text",
            length: "medium",
          });
          summarizerSession.addEventListener("downloadprogress", (e) => {
            console.log(`Downloading summarizer model: ${e.loaded}/${e.total}`);
          });
          await summarizerSession.ready;
          console.log("✅ Summarizer API initialized (model downloaded)");
        }
      }
    }

    // Initialize Rewriter API
    if (ai.rewriter) {
      const canRewrite = await ai.rewriter.capabilities();
      if (canRewrite && canRewrite.available !== "no") {
        if (canRewrite.available === "readily") {
          rewriterSession = await ai.rewriter.create({
            tone: "as-is",
            format: "as-is",
            length: "as-is",
          });
          console.log("✅ Rewriter API initialized");
        } else {
          rewriterSession = await ai.rewriter.create({
            tone: "as-is",
            format: "as-is",
            length: "as-is",
          });
          rewriterSession.addEventListener("downloadprogress", (e) => {
            console.log(`Downloading rewriter model: ${e.loaded}/${e.total}`);
          });
          await rewriterSession.ready;
          console.log("✅ Rewriter API initialized (model downloaded)");
        }
      }
    }

    // Initialize Prompt API (fallback for any AI operation)
    if (ai.languageModel) {
      const canPrompt = await ai.languageModel.capabilities();
      if (canPrompt && canPrompt.available !== "no") {
        if (canPrompt.available === "readily") {
          promptSession = await ai.languageModel.create({
            temperature: 0.5,
            topK: 3,
          });
          console.log("✅ Prompt API initialized");
        } else {
          promptSession = await ai.languageModel.create({
            temperature: 0.5,
            topK: 3,
          });
          promptSession.addEventListener("downloadprogress", (e) => {
            console.log(`Downloading language model: ${e.loaded}/${e.total}`);
          });
          await promptSession.ready;
          console.log("✅ Prompt API initialized (model downloaded)");
        }
      }
    }

    // Update AI mode to chrome if at least one API is available
    if (summarizerSession || rewriterSession || promptSession) {
      await chrome.storage.local.set({ aiMode: "chrome" });
    } else {
      await chrome.storage.local.set({ aiMode: "openai" });
    }
  } catch (error) {
    console.error("Failed to initialize Chrome AI:", error);
    await chrome.storage.local.set({ aiMode: "openai" });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message || {};

  if (type === "noto:openDashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
    sendResponse({ ok: true });
    return;
  }

  if (type === "noto:ai:checkAvailability") {
    handleCheckAIAvailability(sendResponse);
    return true;
  }

  if (type === "noto:ai:reinitialize") {
    handleReinitializeAI(sendResponse);
    return true;
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

async function handleCheckAIAvailability(sendResponse) {
  try {
    const { aiMode } = await chrome.storage.local.get("aiMode");
    const status = {
      mode: aiMode,
      chromeAI: {
        available: typeof ai !== "undefined",
        summarizer: !!summarizerSession,
        rewriter: !!rewriterSession,
        prompt: !!promptSession,
      },
    };
    sendResponse({ ok: true, data: status });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to check AI availability.",
    });
  }
}

async function handleReinitializeAI(sendResponse) {
  try {
    // Clean up existing sessions
    if (summarizerSession) {
      summarizerSession.destroy?.();
      summarizerSession = null;
    }
    if (rewriterSession) {
      rewriterSession.destroy?.();
      rewriterSession = null;
    }
    if (promptSession) {
      promptSession.destroy?.();
      promptSession = null;
    }

    // Reinitialize
    await initializeChromeAI();

    const { aiMode } = await chrome.storage.local.get("aiMode");
    sendResponse({ ok: true, data: { mode: aiMode } });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || "Failed to reinitialize AI.",
    });
  }
}

async function handleSummarize(payload, sendResponse) {
  try {
    const { aiMode } = await chrome.storage.local.get("aiMode");
    let summary;

    if (aiMode === "chrome" && summarizerSession) {
      // Use Chrome Built-in Summarizer API
      summary = await summarizerSession.summarize(payload?.text || "");
    } else if (aiMode === "chrome" && promptSession) {
      // Fallback to Prompt API if Summarizer not available
      const systemPrompt =
        "You are Noto, an assistant that creates crisp summaries of highlighted web content. Focus on the user-selected text only. Provide a concise 2-3 sentence summary.";
      summary = await promptSession.prompt(
        `${systemPrompt}\n\nText to summarize:\n${payload?.text || ""}`
      );
    } else {
      // Fallback to OpenAI
      summary = await requestCompletionsApi({
        prompt: payload?.text || "",
        systemPrompt:
          "You are Noto, an assistant that creates crisp summaries of highlighted web content. Focus on the user-selected text only.",
      });
    }

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
    const { aiMode } = await chrome.storage.local.get("aiMode");
    let rewritten;

    if (aiMode === "chrome" && rewriterSession) {
      // Use Chrome Built-in Rewriter API
      rewritten = await rewriterSession.rewrite(payload?.text || "", {
        context: "Make this note more concise and friendly while keeping the meaning intact.",
      });
    } else if (aiMode === "chrome" && promptSession) {
      // Fallback to Prompt API if Rewriter not available
      const systemPrompt =
        "Rewrite the user note in a concise, friendly tone. Keep the meaning intact.";
      rewritten = await promptSession.prompt(
        `${systemPrompt}\n\nText to rewrite:\n${payload?.text || ""}`
      );
    } else {
      // Fallback to OpenAI
      rewritten = await requestCompletionsApi({
        prompt: payload?.text || "",
        systemPrompt:
          "Rewrite the user note in a concise, friendly tone. Keep the meaning intact.",
      });
    }

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
