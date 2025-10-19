const colorInput = document.getElementById("highlightColor");
const colorPreview = document.getElementById("colorPreview");
const aiBuddyToggle = document.getElementById("aiBuddyToggle");
const apiKeyInput = document.getElementById("apiKey");
const saveApiKeyButton = document.getElementById("saveApiKey");
const clearApiKeyButton = document.getElementById("clearApiKey");
const openDashboardButton = document.getElementById("openDashboard");
const toastTemplate = document.getElementById("toastTemplate");
const aiStatusBadge = document.getElementById("aiModeBadge");
const aiDetails = document.getElementById("aiDetails");
const aiHint = document.getElementById("aiHint");
const fallbackSection = document.getElementById("fallbackSection");
const themeToggle = document.getElementById("themeToggle");
const colorPresets = document.querySelectorAll(".color-preset");

init();

async function init() {
  const settings = await chrome.storage.local.get([
    "highlightColor",
    "aiBuddyEnabled",
    "apiKey",
    "aiMode",
    "theme",
  ]);

  // Set theme
  const theme = settings.theme || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);

  // Set highlight color
  if (settings.highlightColor) {
    colorInput.value = settings.highlightColor;
    colorPreview.textContent = settings.highlightColor;
    updateColorPresetActive(settings.highlightColor);
  }

  aiBuddyToggle.checked = Boolean(settings.aiBuddyEnabled);

  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }

  // Event listeners
  colorInput.addEventListener("input", handleColorPreview);
  colorInput.addEventListener("change", handleColorSave);
  aiBuddyToggle.addEventListener("change", handleBuddyToggle);
  saveApiKeyButton.addEventListener("click", handleSaveApiKey);
  clearApiKeyButton.addEventListener("click", handleClearApiKey);
  openDashboardButton.addEventListener("click", openDashboard);
  themeToggle.addEventListener("click", handleThemeToggle);

  // Color preset listeners
  colorPresets.forEach((preset) => {
    preset.addEventListener("click", () => {
      const color = preset.getAttribute("data-color");
      colorInput.value = color;
      colorPreview.textContent = color;
      updateColorPresetActive(color);
      handleColorSave({ target: { value: color } });
    });
  });

  // Check AI availability
  await checkAIStatus();
}

async function handleThemeToggle() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  updateThemeIcon(newTheme);
  await chrome.storage.local.set({ theme: newTheme });

  showToast(`${newTheme === "dark" ? "🌙" : "☀️"} ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector(".theme-toggle__icon");
  icon.textContent = theme === "light" ? "🌙" : "☀️";
}

function updateColorPresetActive(color) {
  colorPresets.forEach((preset) => {
    if (preset.getAttribute("data-color") === color) {
      preset.classList.add("active");
    } else {
      preset.classList.remove("active");
    }
  });
}

async function checkAIStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "noto:ai:checkAvailability",
    });

    if (response && response.ok) {
      const status = response.data;
      updateAIStatusUI(status);
    } else {
      showAIError();
    }
  } catch (error) {
    console.error("Failed to check AI status:", error);
    showAIError();
  }
}

function updateAIStatusUI(status) {
  const { mode, chromeAI } = status;

  if (mode === "chrome" && chromeAI.available) {
    // Chrome Built-in AI is active
    aiStatusBadge.innerHTML = `
      <span class="ai-status__icon">✨</span>
      <span class="ai-status__text">Chrome AI Active</span>
    `;
    aiStatusBadge.className = "ai-status__badge ai-status__badge--active";

    const apis = [];
    if (chromeAI.summarizer) apis.push("Summarizer");
    if (chromeAI.rewriter) apis.push("Rewriter");
    if (chromeAI.prompt) apis.push("Prompt");

    aiDetails.innerHTML = `
      <div class="ai-status__apis">
        ${apis.map(api => `<span class="ai-status__api">${api}</span>`).join("")}
      </div>
    `;

    aiHint.innerHTML =
      "🔒 Using Chrome Built-in AI (Gemini Nano) - All processing happens on your device";
    fallbackSection.style.display = "none";
  } else {
    // Fallback to OpenAI
    aiStatusBadge.innerHTML = `
      <span class="ai-status__icon">⚠️</span>
      <span class="ai-status__text">OpenAI Fallback</span>
    `;
    aiStatusBadge.className = "ai-status__badge ai-status__badge--fallback";

    aiDetails.innerHTML = `
      <small>Chrome Built-in AI not available. Using OpenAI API.</small>
    `;

    aiHint.innerHTML =
      "⚠️ Chrome Built-in AI unavailable. Enable it in chrome://flags/#optimization-guide-on-device-model";
    fallbackSection.style.display = "block";
  }
}

function showAIError() {
  aiStatusBadge.innerHTML = `
    <span class="ai-status__icon">❌</span>
    <span class="ai-status__text">AI Unavailable</span>
  `;
  aiStatusBadge.className = "ai-status__badge ai-status__badge--error";
  aiDetails.innerHTML = "";
  aiHint.innerHTML = "Failed to check AI status. Please try reloading the extension.";
}

function handleColorPreview(event) {
  colorPreview.textContent = event.target.value;
}

async function handleColorSave(event) {
  const value = event.target.value;
  await chrome.storage.local.set({ highlightColor: value });
  showToast("Highlight color updated");
}

async function handleBuddyToggle(event) {
  const value = event.target.checked;
  await chrome.storage.local.set({ aiBuddyEnabled: value });
  showToast(value ? "AI Buddy enabled" : "AI Buddy disabled");
}

async function handleSaveApiKey() {
  const value = apiKeyInput.value.trim();
  if (!value) {
    showToast("Enter a valid API key before saving.");
    return;
  }
  await chrome.storage.local.set({ apiKey: value });
  showToast("API key saved securely.");
}

async function handleClearApiKey() {
  await chrome.storage.local.set({ apiKey: "" });
  apiKeyInput.value = "";
  showToast("API key removed.");
}

function openDashboard() {
  chrome.runtime.sendMessage({ type: "noto:openDashboard" }).catch(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
  });
  window.close();
}

function showToast(message) {
  const toast = toastTemplate.content.firstElementChild.cloneNode(true);
  toast.querySelector(".toast__message").textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}
