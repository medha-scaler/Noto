const HIGHLIGHTS_KEY = "highlights";

function withStorage(callback) {
  return new Promise((resolve, reject) => {
    try {
      callback(resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function readHighlights() {
  return withStorage((resolve, reject) => {
    chrome.storage.local.get(HIGHLIGHTS_KEY, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result[HIGHLIGHTS_KEY] || {});
    });
  });
}

async function writeHighlights(highlights) {
  return withStorage((resolve, reject) => {
    chrome.storage.local.set({ [HIGHLIGHTS_KEY]: highlights }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(true);
    });
  });
}

export async function saveHighlight(data) {
  const highlights = await readHighlights();
  const { id } = data;
  highlights[id] = data;
  await writeHighlights(highlights);
  return data;
}

export async function getHighlights(url) {
  const highlights = await readHighlights();
  return Object.values(highlights).filter((highlight) => highlight.url === url);
}

export async function getAllHighlights() {
  const highlights = await readHighlights();
  return Object.values(highlights);
}

export async function getHighlight(id) {
  const highlights = await readHighlights();
  return highlights[id] || null;
}

export async function updateHighlight(id, updates) {
  const highlights = await readHighlights();
  if (!highlights[id]) {
    throw new Error("Highlight not found.");
  }
  const updated = { ...highlights[id], ...updates, updatedAt: Date.now() };
  highlights[id] = updated;
  await writeHighlights(highlights);
  return updated;
}

export async function removeHighlight(id) {
  const highlights = await readHighlights();
  if (highlights[id]) {
    delete highlights[id];
    await writeHighlights(highlights);
  }
}

export async function clearHighlights() {
  await writeHighlights({});
}
