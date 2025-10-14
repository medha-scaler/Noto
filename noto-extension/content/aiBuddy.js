export function initAiBuddy({
  getHighlightCount = () => 0,
  onSummarizePage = () => {},
}) {
  const container = document.createElement("div");
  container.className = "noto-ai-buddy hidden";
  container.innerHTML = `
    <div class="noto-ai-avatar">
      <div class="noto-ai-eye"></div>
      <div class="noto-ai-eye"></div>
    </div>
    <div class="noto-ai-bubble">
      <p class="noto-ai-message">Hi! I’m Noto. Highlight something and I’ll help you remember it.</p>
      <div class="noto-ai-actions">
        <button class="noto-ai-btn" data-action="summary">One-line summary</button>
        <button class="noto-ai-btn subtle" data-action="dismiss">Dismiss</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  requestAnimationFrame(() => container.classList.remove("hidden"));

  const messageEl = container.querySelector(".noto-ai-message");
  const actions = container.querySelector(".noto-ai-actions");
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const updateMessage = () => {
    const count = getHighlightCount();
    if (count === 0) {
      messageEl.textContent =
        "Hi! Highlight text to get AI summaries and save notes.";
    } else if (count === 1) {
      messageEl.textContent =
        "Nice! You have 1 highlight on this page. Want a quick summary?";
    } else {
      messageEl.textContent = `You’ve highlighted ${count} sections here. Need a refresher?`;
    }
  };

  updateMessage();

  actions.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (action === "summary") {
      setState(container, "thinking");
      onSummarizePage()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => setState(container, "idle"), 1500);
        });
    }
    if (action === "dismiss") {
      container.classList.add("hidden");
    }
  });

  container.addEventListener("mousedown", (event) => {
    if (!event.target.closest(".noto-ai-avatar")) {
      return;
    }
    isDragging = true;
    dragOffsetX = event.clientX - container.offsetLeft;
    dragOffsetY = event.clientY - container.offsetTop;
    container.classList.add("dragging");
    event.preventDefault();
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    const x = event.clientX - dragOffsetX;
    const y = event.clientY - dragOffsetY;
    container.style.left = `${Math.max(16, x)}px`;
    container.style.top = `${Math.max(16, y)}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("dragging");
  });

  return {
    updateMessage,
    destroy() {
      container.remove();
    },
  };
}

function setState(container, state) {
  container.dataset.state = state;
}
