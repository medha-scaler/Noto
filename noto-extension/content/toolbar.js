export class Toolbar {
  constructor({ onHighlight, onNote, onSummarize }) {
    this.onHighlight = onHighlight;
    this.onNote = onNote;
    this.onSummarize = onSummarize;
    this.selectionText = "";
    this.root = createToolbarElement();
    document.body.appendChild(this.root);
    this.attachEvents();
  }

  attachEvents() {
    this.root.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.root.addEventListener("click", (event) => {
      const action = event.target.dataset?.action;
      if (!action) return;
      event.stopPropagation();

      if (action === "highlight" && typeof this.onHighlight === "function") {
        this.onHighlight(this.selectionText);
      }
      if (action === "note" && typeof this.onNote === "function") {
        this.onNote(this.selectionText);
      }
      if (action === "summarize" && typeof this.onSummarize === "function") {
        this.onSummarize(this.selectionText);
      }
    });
  }

  show({ x, y, text }) {
    this.selectionText = text || "";
    this.root.style.top = `${y + window.scrollY}px`;
    this.root.style.left = `${x + window.scrollX}px`;
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
    this.selectionText = "";
    this.setLoading(false);
  }

  setLoading(isLoading) {
    const summarizeButton = this.root.querySelector('[data-action="summarize"]');
    if (!summarizeButton) return;
    summarizeButton.disabled = Boolean(isLoading);
    summarizeButton.dataset.loading = Boolean(isLoading);
  }

  isVisible() {
    return !this.root.classList.contains("hidden");
  }
}

function createToolbarElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "noto-toolbar hidden";
  wrapper.innerHTML = `
    <button class="noto-toolbar-btn" data-action="highlight" title="Highlight">
      ✨
    </button>
    <button class="noto-toolbar-btn" data-action="note" title="Add note">
      📝
    </button>
    <button class="noto-toolbar-btn" data-action="summarize" title="Summarize with AI">
      🤖
    </button>
  `;
  return wrapper;
}
