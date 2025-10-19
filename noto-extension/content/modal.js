/**
 * Custom modal system to replace window.prompt, window.alert, and window.confirm
 * with beautiful, modern modal dialogs that support dark mode and animations
 */

export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.overlay = null;
  }

  /**
   * Show a prompt dialog (replaces window.prompt)
   */
  async prompt(message, defaultValue = "") {
    return new Promise((resolve) => {
      this.createModal({
        type: "prompt",
        message,
        defaultValue,
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    });
  }

  /**
   * Show an alert dialog (replaces window.alert)
   */
  async alert(message) {
    return new Promise((resolve) => {
      this.createModal({
        type: "alert",
        message,
        onConfirm: () => resolve(true),
      });
    });
  }

  /**
   * Show a confirm dialog (replaces window.confirm)
   */
  async confirm(message) {
    return new Promise((resolve) => {
      this.createModal({
        type: "confirm",
        message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  /**
   * Create and display a modal
   */
  createModal({ type, message, defaultValue = "", onConfirm, onCancel }) {
    // Close any existing modal
    this.close();

    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "noto-modal-overlay";

    // Create modal
    const modal = document.createElement("div");
    modal.className = `noto-modal noto-modal--${type}`;

    // Modal content
    const content = this.createModalContent(type, message, defaultValue);
    modal.appendChild(content);

    // Buttons
    const actions = this.createModalActions(type, () => {
      const value = type === "prompt" ? modal.querySelector("input")?.value : true;
      this.close();
      onConfirm?.(value);
    }, () => {
      this.close();
      onCancel?.();
    });
    modal.appendChild(actions);

    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.classList.add("noto-modal-overlay--visible");
    });

    // Focus input for prompt
    if (type === "prompt") {
      const input = modal.querySelector("input");
      input?.focus();
      input?.select();

      // Handle Enter key
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.close();
          onConfirm?.(input.value);
        } else if (e.key === "Escape") {
          this.close();
          onCancel?.();
        }
      });
    }

    // Handle Escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        this.close();
        onCancel?.();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Close on overlay click
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
        onCancel?.();
      }
    });

    this.activeModal = modal;
  }

  /**
   * Create modal content based on type
   */
  createModalContent(type, message, defaultValue) {
    const content = document.createElement("div");
    content.className = "noto-modal__content";

    // Icon
    const icon = document.createElement("div");
    icon.className = "noto-modal__icon";
    icon.textContent = this.getIcon(type);
    content.appendChild(icon);

    // Message
    const messageEl = document.createElement("p");
    messageEl.className = "noto-modal__message";
    messageEl.textContent = message;
    content.appendChild(messageEl);

    // Input for prompt
    if (type === "prompt") {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "noto-modal__input";
      input.value = defaultValue;
      input.placeholder = "Enter text...";
      content.appendChild(input);
    }

    return content;
  }

  /**
   * Create modal action buttons
   */
  createModalActions(type, onConfirm, onCancel) {
    const actions = document.createElement("div");
    actions.className = "noto-modal__actions";

    if (type === "alert") {
      // Only OK button for alert
      const okBtn = this.createButton("OK", "primary", onConfirm);
      actions.appendChild(okBtn);
    } else {
      // Cancel and Confirm buttons for prompt/confirm
      const cancelBtn = this.createButton("Cancel", "secondary", onCancel);
      const confirmBtn = this.createButton(
        type === "confirm" ? "Confirm" : "Save",
        "primary",
        onConfirm
      );
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
    }

    return actions;
  }

  /**
   * Create a button element
   */
  createButton(text, variant, onClick) {
    const button = document.createElement("button");
    button.className = `noto-modal__btn noto-modal__btn--${variant}`;
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  /**
   * Get icon for modal type
   */
  getIcon(type) {
    const icons = {
      prompt: "✏️",
      alert: "ℹ️",
      confirm: "❓",
    };
    return icons[type] || "💬";
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.overlay) return;

    this.overlay.classList.remove("noto-modal-overlay--visible");

    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.activeModal = null;
    }, 300);
  }
}

// Export a singleton instance
export const modal = new ModalManager();
