import { fuzzyMatchText } from "../utils/helpers.js";

const HIGHLIGHT_CLASS = "noto-highlight";
const TOOLTIP_ID = "noto-tooltip";

export function createHighlighter({ onEdit, onDelete } = {}) {
  const tooltip = ensureTooltip({ onEdit, onDelete });
  const active = {
    tooltipHideTimer: null,
  };

  document.addEventListener("click", (event) => {
    if (!tooltip.contains(event.target)) {
      hideTooltip(tooltip);
    }
  });

  return {
    createFromSelection(selection, highlightData) {
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0).cloneRange();
      if (range.collapsed) {
        return null;
      }

      const serializedRange = serializeRange(range);
      const wrapper = wrapRange(range, highlightData, tooltip, active);
      selection.removeAllRanges();

      return { wrapper, serializedRange };
    },

    applyStoredHighlight(highlightData) {
      if (!highlightData) {
        return false;
      }
      let range = null;
      if (highlightData.range) {
        range = deserializeRange(highlightData.range);
      }

      if (!range) {
        range = findRangeByText(highlightData.text, highlightData.context);
      }

      if (!range) {
        return false;
      }

      wrapRange(range, highlightData, tooltip, active);
      return true;
    },

    removeHighlight(id) {
      const elements = document.querySelectorAll(
        `.${HIGHLIGHT_CLASS}[data-noto-id="${id}"]`
      );
      elements.forEach((element) => unwrapHighlight(element));
    },

    updateHighlightElement(highlightData) {
      const elements = document.querySelectorAll(
        `.${HIGHLIGHT_CLASS}[data-noto-id="${highlightData.id}"]`
      );
      elements.forEach((element) => {
        applyHighlightDataset(element, highlightData);
      });
    },
  };
}

function wrapRange(range, highlightData, tooltip, state) {
  const wrapper = document.createElement("mark");
  wrapper.className = HIGHLIGHT_CLASS;
  wrapper.dataset.notoId = highlightData.id;
  applyHighlightDataset(wrapper, highlightData);

  const contents = range.cloneContents();
  wrapper.appendChild(contents);

  range.deleteContents();
  range.insertNode(wrapper);

  attachHighlightEvents(wrapper, tooltip, state);
  range.detach();
  return wrapper;
}

function applyHighlightDataset(element, highlightData) {
  element.dataset.note = highlightData.note || "";
  element.dataset.summary = highlightData.summary || "";
  element.dataset.color = highlightData.color || "";
  element.dataset.url = highlightData.url || "";
  element.style.backgroundColor = highlightData.color || "#fadc4d";
  element.style.cursor = "pointer";
}

function attachHighlightEvents(element, tooltip, state) {
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    showTooltipForHighlight(element, tooltip);
  });

  element.addEventListener("mouseenter", () => {
    clearTimeout(state.tooltipHideTimer);
  });

  element.addEventListener("mouseleave", () => {
    clearTimeout(state.tooltipHideTimer);
    state.tooltipHideTimer = setTimeout(() => hideTooltip(tooltip), 200);
  });
}

function ensureTooltip({ onEdit, onDelete }) {
  let tooltip = document.getElementById(TOOLTIP_ID);
  if (tooltip) {
    return tooltip;
  }

  tooltip = document.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.className = "noto-tooltip hidden";
  tooltip.innerHTML = `
    <div class="noto-tooltip-body">
      <div class="noto-tooltip-text"></div>
      <div class="noto-tooltip-summary"></div>
    </div>
    <div class="noto-tooltip-actions">
      <button class="noto-tooltip-btn noto-edit">Edit</button>
      <button class="noto-tooltip-btn noto-delete">Delete</button>
    </div>
  `;

  tooltip.addEventListener("mouseenter", () => {
    tooltip.classList.add("pinned");
  });

  tooltip.addEventListener("mouseleave", () => {
    tooltip.classList.remove("pinned");
    hideTooltip(tooltip);
  });

  tooltip
    .querySelector(".noto-edit")
    .addEventListener("click", (event) => {
      event.stopPropagation();
      const id = tooltip.dataset.id;
      if (id && typeof onEdit === "function") {
        onEdit(id);
      }
    });

  tooltip
    .querySelector(".noto-delete")
    .addEventListener("click", (event) => {
      event.stopPropagation();
      const id = tooltip.dataset.id;
      if (id && typeof onDelete === "function") {
        onDelete(id);
      }
    });

  document.body.appendChild(tooltip);
  return tooltip;
}

function hideTooltip(tooltip) {
  if (!tooltip) return;
  tooltip.classList.add("hidden");
  tooltip.dataset.id = "";
}

function showTooltipForHighlight(element, tooltip) {
  if (!tooltip) return;
  const rect = element.getBoundingClientRect();
  const { scrollX, scrollY } = window;

  const note = element.dataset.note;
  const summary = element.dataset.summary;

  tooltip.dataset.id = element.dataset.notoId;
  tooltip.querySelector(".noto-tooltip-text").textContent = note || "No note yet.";
  tooltip.querySelector(".noto-tooltip-summary").textContent =
    summary || "No AI summary yet.";
  tooltip.style.top = `${scrollY + rect.bottom + 8}px`;
  tooltip.style.left = `${scrollX + rect.left}px`;
  tooltip.classList.remove("hidden");
}

function serializeRange(range) {
  return {
    startXPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endXPath: getXPath(range.endContainer),
    endOffset: range.endOffset,
  };
}

function deserializeRange(rangeData) {
  if (!rangeData) {
    return null;
  }

  const startNode = getNodeByXPath(rangeData.startXPath);
  const endNode = getNodeByXPath(rangeData.endXPath);
  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, rangeData.startOffset);
    range.setEnd(endNode, rangeData.endOffset);
    return range;
  } catch (error) {
    return null;
  }
}

function getXPath(node) {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) {
    const parentPath = getXPath(node.parentNode);
    const index = getTextNodeIndex(node);
    return `${parentPath}/text()[${index}]`;
  }
  if (node === document.body) {
    return "/html/body";
  }

  let index = 0;
  const siblings = node.parentNode ? node.parentNode.children : [];
  for (let i = 0; i < siblings.length; i += 1) {
    if (siblings[i].nodeName === node.nodeName) {
      index += 1;
    }
    if (siblings[i] === node) {
      return `${getXPath(node.parentNode)}/${node.nodeName.toLowerCase()}[${index}]`;
    }
  }
  return "";
}

function getNodeByXPath(path) {
  if (!path) return null;
  const result = document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue;
}

function getTextNodeIndex(node) {
  if (!node.parentNode) return 1;
  const siblings = node.parentNode.childNodes;
  let index = 0;
  for (let i = 0; i < siblings.length; i += 1) {
    const sibling = siblings[i];
    if (sibling.nodeType === Node.TEXT_NODE) {
      index += 1;
    }
    if (sibling === node) {
      return index || 1;
    }
  }
  return 1;
}

function findRangeByText(text, context = {}) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return null;
  }

  const lowerTarget = trimmed.toLowerCase();
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.parentElement) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement.closest(`.${HIGHLIGHT_CLASS}`)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const candidates = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    const content = currentNode.textContent;
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(lowerTarget);
    if (index !== -1) {
      const range = document.createRange();
      range.setStart(currentNode, index);
      range.setEnd(currentNode, index + trimmed.length);
      return range;
    }

    const { before, after } = context || {};
    const combined = `${before || ""}${content}${after || ""}`;
    const match = fuzzyMatchText(combined, trimmed);
    if (match.isMatch) {
      candidates.push({ node: currentNode, score: match.score });
    }
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  const range = document.createRange();
  range.selectNodeContents(winner.node);
  return range;
}

function unwrapHighlight(element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}
