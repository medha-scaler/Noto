import {
  getAllHighlights,
  updateHighlight,
  removeHighlight,
} from "../utils/storage.js";
import {
  summarizeText,
  rewriteText,
} from "../utils/ai.js";

const highlightsList = document.getElementById("highlightsList");
const highlightTemplate = document.getElementById("highlightTemplate");
const siteFilter = document.getElementById("siteFilter");
const colorFilter = document.getElementById("colorFilter");
const dateFilter = document.getElementById("dateFilter");
const searchInput = document.getElementById("searchInput");
const summarizeAllButton = document.getElementById("summarizeAll");
const exportJsonButton = document.getElementById("exportJson");
const exportCsvButton = document.getElementById("exportCsv");
const editDialog = document.getElementById("editDialog");
const editNoteInput = document.getElementById("editNoteInput");
const loadingDialog = document.getElementById("loadingDialog");

const state = {
  highlights: [],
  filtered: [],
  editingId: null,
};

await loadHighlights();
renderHighlights();

siteFilter.addEventListener("change", applyFilters);
colorFilter.addEventListener("change", applyFilters);
dateFilter.addEventListener("change", applyFilters);
searchInput.addEventListener("input", debounce(applyFilters, 150));

highlightsList.addEventListener("click", handleActionClick);
summarizeAllButton.addEventListener("click", handleSummarizeAll);
exportJsonButton.addEventListener("click", exportJson);
exportCsvButton.addEventListener("click", exportCsv);

editDialog.addEventListener("close", async () => {
  if (editDialog.returnValue !== "confirm") {
    state.editingId = null;
    return;
  }

  const note = editNoteInput.value.trim();
  if (!state.editingId) return;

  await performUpdate(state.editingId, { note });
  state.editingId = null;
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes.highlights) {
    await loadHighlights();
    renderHighlights();
  }
});

async function loadHighlights() {
  const highlights = await getAllHighlights();
  state.highlights = highlights.sort(
    (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
  );
  state.filtered = [...state.highlights];
  populateFilterOptions();
}

function populateFilterOptions() {
  const prevSite = siteFilter.value;
  const prevColor = colorFilter.value;

  const sites = new Set();
  const colors = new Set();

  state.highlights.forEach((highlight) => {
    const url = safeUrl(highlight.url);
    if (url) {
      sites.add(url.hostname);
    }
    if (highlight.color) {
      colors.add(highlight.color);
    }
  });

  siteFilter.innerHTML =
    `<option value="all">All sites</option>` +
    Array.from(sites)
      .sort()
      .map((hostname) => `<option value="${hostname}">${hostname}</option>`)
      .join("");

  colorFilter.innerHTML =
    `<option value="all">All colors</option>` +
    Array.from(colors)
      .map((color) => `<option value="${color}">${color}</option>`)
      .join("");

  if (Array.from(siteFilter.options).some((option) => option.value === prevSite)) {
    siteFilter.value = prevSite;
  }
  if (Array.from(colorFilter.options).some((option) => option.value === prevColor)) {
    colorFilter.value = prevColor;
  }
}

function applyFilters() {
  const siteValue = siteFilter.value;
  const colorValue = colorFilter.value;
  const dateValue = dateFilter.value;
  const query = searchInput.value.trim().toLowerCase();

  state.filtered = state.highlights.filter((highlight) => {
    const url = safeUrl(highlight.url);
    const host = url?.hostname || "";

    if (siteValue !== "all" && host !== siteValue) {
      return false;
    }

    if (colorValue !== "all" && highlight.color !== colorValue) {
      return false;
    }

    if (dateValue !== "all") {
      const days = parseInt(dateValue, 10);
      const created = highlight.createdAt || highlight.updatedAt;
      if (created) {
        const diff =
          (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
        if (diff > days) {
          return false;
        }
      }
    }

    if (query) {
      const haystack = [
        highlight.text,
        highlight.note,
        highlight.summary,
        highlight.url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  renderHighlights();
}

function renderHighlights() {
  highlightsList.innerHTML = "";

  if (!state.filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent =
      "No highlights match your filters yet. Highlight something new!";
    highlightsList.appendChild(empty);
    return;
  }

  state.filtered.forEach((highlight) => {
    const fragment = highlightTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".highlight-card");
    const siteEl = fragment.querySelector(".highlight-card__site");
    const timeEl = fragment.querySelector(".highlight-card__time");
    const textEl = fragment.querySelector(".highlight-card__text");
    const noteEl = fragment.querySelector(".highlight-card__note");
    const summaryEl = fragment.querySelector(".highlight-card__summary");
    const colorDot = fragment.querySelector(".color-dot");
    const actions = fragment.querySelector(".highlight-card__actions");

    const url = safeUrl(highlight.url);
    siteEl.textContent = url?.hostname || "Unknown site";
    siteEl.title = highlight.url;

    const timestamp = highlight.updatedAt || highlight.createdAt;
    timeEl.textContent = timestamp ? formatDate(timestamp) : "";

    textEl.textContent = highlight.text;
    noteEl.textContent = highlight.note || "No note yet.";
    summaryEl.textContent = highlight.summary || "No summary yet.";
    colorDot.style.backgroundColor = highlight.color || "#fadc4d";

    actions.dataset.id = highlight.id;

    highlightsList.appendChild(fragment);
  });
}

async function handleActionClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;

  const id = event.target.closest(".highlight-card__actions")?.dataset.id;
  const highlight = state.highlights.find((item) => item.id === id);
  if (!id || !highlight) return;

  if (action === "edit") {
    state.editingId = id;
    editNoteInput.value = highlight.note || "";
    editDialog.showModal();
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm("Delete this highlight permanently?");
    if (!confirmed) return;
    await removeHighlight(id);
    await loadHighlights();
    renderHighlights();
    return;
  }

  if (action === "summarize") {
    await withLoading(async () => {
      const summary = await summarizeText(highlight.text);
      await performUpdate(id, { summary });
    });
    return;
  }

  if (action === "rewrite") {
    if (!highlight.note) {
      window.alert("Add a note first so I can rewrite it.");
      return;
    }
    await withLoading(async () => {
      const note = await rewriteText(highlight.note);
      await performUpdate(id, { note });
    });
  }
}

async function performUpdate(id, updates) {
  const updated = await updateHighlight(id, { ...updates, updatedAt: Date.now() });
  state.highlights = state.highlights.map((highlight) =>
    highlight.id === id ? updated : highlight
  );
  applyFilters();
}

async function handleSummarizeAll() {
  if (!state.filtered.length) {
    window.alert("No highlights available to summarize.");
    return;
  }

  const input = state.filtered
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join("\n");

  await withLoading(async () => {
    const summary = await summarizeText(
      `Create a concise summary synthesizing these notes:\n${input}`
    );
    window.alert(`Summary of filtered highlights:\n\n${summary}`);
  });
}

async function exportJson() {
  const blob = new Blob([JSON.stringify(state.filtered, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, "noto-highlights.json");
}

async function exportCsv() {
  const rows = [
    ["URL", "Text", "Note", "Summary", "Color", "CreatedAt", "UpdatedAt"],
    ...state.filtered.map((highlight) => [
      escapeCsv(highlight.url),
      escapeCsv(highlight.text),
      escapeCsv(highlight.note || ""),
      escapeCsv(highlight.summary || ""),
      escapeCsv(highlight.color || ""),
      escapeCsv(new Date(highlight.createdAt || 0).toISOString()),
      escapeCsv(new Date(highlight.updatedAt || highlight.createdAt || 0).toISOString()),
    ]),
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, "noto-highlights.csv");
}

async function withLoading(fn) {
  loadingDialog.showModal();
  try {
    await fn();
  } catch (error) {
    console.error(error);
    window.alert(error.message || "Something went wrong.");
  } finally {
    loadingDialog.close();
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function safeUrl(url) {
  try {
    return new URL(url);
  } catch (error) {
    return null;
  }
}

function escapeCsv(value) {
  if (typeof value !== "string") {
    return value;
  }
  const escaped = value.replace(/"/g, '""');
  if (escaped.match(/("|,|\n)/)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
