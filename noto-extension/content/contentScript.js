(async () => {
  const MODULES = await Promise.all([
    import(chrome.runtime.getURL("content/toolbar.js")),
    import(chrome.runtime.getURL("content/highlighter.js")),
    import(chrome.runtime.getURL("content/aiBuddy.js")),
    import(chrome.runtime.getURL("utils/helpers.js")),
    import(chrome.runtime.getURL("utils/storage.js")),
    import(chrome.runtime.getURL("utils/ai.js")),
  ]);

  const [{ Toolbar }, { createHighlighter }, { initAiBuddy }, helpers, storage, ai] =
    MODULES;

  const { generateId, getSelectionContext } = helpers;

  const state = {
    highlightColor: "#fadc4d",
    aiBuddyEnabled: true,
    highlights: new Map(),
    buddy: null,
  };

  const highlighter = createHighlighter({
    onEdit: handleEditHighlight,
    onDelete: handleDeleteHighlight,
  });

  const toolbar = new Toolbar({
    onHighlight: () => createHighlight({ mode: "highlight" }),
    onNote: () => createHighlight({ mode: "note" }),
    onSummarize: () => createHighlight({ mode: "summarize" }),
  });

  await bootstrap();

  async function bootstrap() {
    const settings = await chrome.storage.local.get([
      "highlightColor",
      "aiBuddyEnabled",
    ]);

    if (settings.highlightColor) {
      state.highlightColor = settings.highlightColor;
    }

    if (typeof settings.aiBuddyEnabled === "boolean") {
      state.aiBuddyEnabled = settings.aiBuddyEnabled;
    }

    await restoreHighlights();

    if (state.aiBuddyEnabled) {
      initBuddy();
    }

    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("keyup", handleSelectionChange);
    document.addEventListener("mousedown", () => toolbar.hide());

    chrome.storage.onChanged.addListener(handleStorageChange);
  }

  function handleSelectionChange(event) {
    const selection = window.getSelection();
    if (event.target.closest(".noto-toolbar") || !selection || selection.isCollapsed) {
      toolbar.hide();
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.top === 0 && rect.left === 0)) {
      toolbar.hide();
      return;
    }

    toolbar.show({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selection.toString(),
    });
  }

  async function createHighlight({ mode }) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      toolbar.hide();
      return;
    }

    const baseData = buildHighlightPayload(selection);
    let note = "";
    let summary = "";

    if (mode === "note") {
      const input = window.prompt("Add a note for this highlight:", baseData.text);
      if (input === null) {
        return;
      }
      note = input.trim();
    }

    if (mode === "summarize") {
      toolbar.setLoading(true);
      try {
        summary = await ai.summarizeText(baseData.text);
      } catch (error) {
        console.warn("[Noto] Summarize failed", error);
        window.alert(error.message || "Summarization failed.");
        toolbar.setLoading(false);
        return;
      }
    }

    const highlightData = {
      ...baseData,
      note,
      summary,
    };

    const result = highlighter.createFromSelection(selection, highlightData);
    if (!result) {
      toolbar.hide();
      return;
    }

    highlightData.range = result.serializedRange;
    const saved = await storage.saveHighlight(highlightData);
    state.highlights.set(saved.id, saved);
    toolbar.hide();
    state.buddy?.updateMessage?.();
    chrome.runtime.sendMessage({ type: "noto:highlight:created" }).catch(() => {});

    if (mode === "summarize") {
      toolbar.setLoading(false);
    highlighter.updateHighlightElement(saved);
    }
  }

  function buildHighlightPayload(selection) {
    const rangeText = selection.toString();
    return {
      id: generateId("highlight"),
      url: location.href.split("#")[0],
      text: rangeText,
      color: state.highlightColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context: getSelectionContext(selection),
    };
  }

  async function restoreHighlights() {
    const highlights = await storage.getHighlights(location.href.split("#")[0]);
    const attached = highlights.filter((highlight) =>
      highlighter.applyStoredHighlight(highlight)
    );
    attached.forEach((highlight) => {
      state.highlights.set(highlight.id, highlight);
    });
    state.buddy?.updateMessage?.();
  }

  async function handleEditHighlight(id) {
    const highlight = state.highlights.get(id);
    if (!highlight) {
      return;
    }

    const updatedNote = window.prompt("Update your note:", highlight.note || "");
    if (updatedNote === null) {
      return;
    }

    const note = updatedNote.trim();
    const updated = await storage.updateHighlight(id, { note });
    state.highlights.set(id, updated);
    highlighter.updateHighlightElement(updated);
  }

  async function handleDeleteHighlight(id) {
    const highlight = state.highlights.get(id);
    if (!highlight) return;

    if (!window.confirm("Delete this highlight?")) {
      return;
    }

    await storage.removeHighlight(id);
    highlighter.removeHighlight(id);
    state.highlights.delete(id);
    state.buddy?.updateMessage?.();
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== "local") return;
    if (changes.highlightColor) {
      state.highlightColor = changes.highlightColor.newValue || state.highlightColor;
    }
    if (changes.aiBuddyEnabled) {
      state.aiBuddyEnabled = changes.aiBuddyEnabled.newValue;
      if (state.aiBuddyEnabled && !state.buddy) {
        initBuddy();
      }
      if (!state.aiBuddyEnabled && state.buddy) {
        state.buddy.destroy();
        state.buddy = null;
      }
    }

    if (changes.highlights) {
      syncHighlightsFromStorage(changes.highlights.newValue || {});
    }
  }

  function syncHighlightsFromStorage(storageMap) {
    const currentIds = new Set(Object.keys(storageMap));

    state.highlights.forEach((highlight, id) => {
      if (!currentIds.has(id)) {
        highlighter.removeHighlight(id);
        state.highlights.delete(id);
      }
    });

    Object.values(storageMap).forEach((highlight) => {
      highlighter.removeHighlight(highlight.id);
      state.highlights.set(highlight.id, highlight);
      highlighter.applyStoredHighlight(highlight);
    });

    state.buddy?.updateMessage?.();
  }

  function initBuddy() {
    state.buddy = initAiBuddy({
      getHighlightCount: () => state.highlights.size,
      onSummarizePage: summarizePageHighlights,
    });
  }

  async function summarizePageHighlights() {
    if (!state.highlights.size) {
      window.alert("Highlight something first for me to summarize!");
      return;
    }

    const combined = Array.from(state.highlights.values())
      .map((item) => `• ${item.text}`)
      .join("\n");

    try {
      const result = await ai.summarizeText(
        `Summarize the following bullet points from a page in under 3 sentences:\n${combined}`
      );
      window.alert(`Noto summary:\n\n${result}`);
    } catch (error) {
      window.alert(error.message || "Unable to summarize right now.");
    }
  }
})();
