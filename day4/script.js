const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

const DRAFT_KEY = "quicknotes-draft";
const THEME_KEY = "quicknotes-theme";

function updateCounts() {
  const text = noteText.value;
  const characterCount = text.length;

  const words = text.trim() === ""
    ? 0
    : text.trim().split(/\s+/).length;

  charCount.textContent = `${characterCount} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");

  if (characterCount > 200) {
    charCount.classList.add("over");
  } else if (characterCount > 180) {
    charCount.classList.add("warning");
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

function loadDraft() {
  const savedDraft = localStorage.getItem(DRAFT_KEY);

  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  noteText.focus();
}

function updateThemeButton() {
  if (document.body.classList.contains("dark")) {
    themeToggle.textContent = "Light mode";
  } else {
    themeToggle.textContent = "Dark mode";
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  updateThemeButton();
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");

  localStorage.setItem(
    THEME_KEY,
    isDark ? "dark" : "light"
  );

  updateThemeButton();
}

noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

clearBtn.addEventListener("click", () => {
  clearNote();
});

themeToggle.addEventListener("click", () => {
  toggleTheme();
});

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

loadDraft();
loadTheme();
updateCounts();