const colorInput = document.getElementById("highlightColor");
const colorPreview = document.getElementById("colorPreview");
const aiBuddyToggle = document.getElementById("aiBuddyToggle");
const apiKeyInput = document.getElementById("apiKey");
const saveApiKeyButton = document.getElementById("saveApiKey");
const clearApiKeyButton = document.getElementById("clearApiKey");
const openDashboardButton = document.getElementById("openDashboard");
const toastTemplate = document.getElementById("toastTemplate");

init();

async function init() {
  const settings = await chrome.storage.local.get([
    "highlightColor",
    "aiBuddyEnabled",
    "apiKey",
  ]);

  if (settings.highlightColor) {
    colorInput.value = settings.highlightColor;
    colorPreview.textContent = settings.highlightColor;
  }

  aiBuddyToggle.checked = Boolean(settings.aiBuddyEnabled);

  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }

  colorInput.addEventListener("input", handleColorPreview);
  colorInput.addEventListener("change", handleColorSave);
  aiBuddyToggle.addEventListener("change", handleBuddyToggle);
  saveApiKeyButton.addEventListener("click", handleSaveApiKey);
  clearApiKeyButton.addEventListener("click", handleClearApiKey);
  openDashboardButton.addEventListener("click", openDashboard);
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
