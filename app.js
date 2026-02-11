// ====== Simple SPA Router for GitHub Pages (hash routing) ======
const pageEl = document.getElementById("page");
const searchEl = document.getElementById("globalSearch");
const themeBtn = document.getElementById("toggleTheme");

const state = {
  sheets: null,
  questions: null,
  searchText: "",
};

// --- LocalStorage helpers ---
const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// --- Theme toggle (basic) ---
function applyTheme() {
  const isLight = LS.get("theme_light", false);
  if (isLight) {
    document.documentElement.style.setProperty("--bg", "#f6f7fb");
    document.documentElement.style.setProperty("--panel", "#ffffff");
    document.documentElement.style.setProperty("--card", "#ffffff");
    document.documentElement.style.setProperty("--text", "#111827");
    document.documentElement.style.setProperty("--muted", "#4b5563");
    document.documentElement.style.setProperty("--line", "#e5e7eb");
    themeBtn.textContent = "☀️";
  } else {
    document.documentElement.style.setProperty("--bg", "#0b0f14");
    document.documentElement.style.setProperty("--panel", "#111827");
    document.documentElement.style.setProperty("--card", "#0f172a");
    document.documentElement.style.setProperty("--text", "#e5e7eb");
    document.documentElement.style.setProperty("--muted", "#9ca3af");
    document.documentElement.style.setProperty("--line", "#1f2937");
    themeBtn.textContent = "🌙";
  }
}
themeBtn.addEventListener("click", () => {
  const curr = LS.get("theme_light", false);
  LS.set("theme_light", !curr);
  applyTheme();
});
applyTheme();

// --- Load data (JSON) ---
async function loadData() {
  if (state.sheets && state.questions) return;

  try {
    const [sheetsRes, questionsRes] = await Promise.all([
      fetch("./data/sheets.json"),
      fetch("./data/questions.json"),
    ]);

    state.sheets = await sheetsRes.json();
    state.questions = await questionsRes.json();
  } catch (e) {
    console.error(e);
    pageEl.innerHTML = `
      <h1 class="h1">Data load error</h1>
      <p class="lead">Please check <code>data/sheets.json</code> and <code>data/questions.json</code>.</p>
    `;
  }
}

// --- Navigation active link ---
function setActiveNav(route) {
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

// --- Pages (Part 1: basic pages) ---
function renderHome() {
  setActiveNav("home");

  const progress = LS.get("progress", {
    studiedChapters: 0,
    practiceDone: 0,
    mockHistory: []
  });

  const lastMock = progress.mockHistory?.[0];

  pageEl.innerHTML = `
    <h1 class="h1">Welcome 👋</h1>
    <p class="lead">
      This is your personal Taxi Exam preparation site. Use the menu to study sheets,
      practice questions, and take a real-time mock exam.
    </p>

    <div class="grid">
      <div class="card">
        <div class="badge">Study</div>
        <h3>📘 Study Sheets</h3>
        <p>Read the preparation sheet with chapters, easy translation, and bookmarks.</p>
        <div class="row">
          <span class="small muted">Studied: ${progress.studiedChapters} chapters</span>
          <a class="btn primary" href="#/study">Open</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Practice</div>
        <h3>📝 Practice Questions</h3>
        <p>Topic-wise MCQ practice with instant answers & explanation.</p>
        <div class="row">
          <span class="small muted">Done: ${progress.practiceDone} questions</span>
          <a class="btn primary" href="#/practice">Start</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Mock Exam</div>
        <h3>⏱️ Real Exam (50Q / 50min)</h3>
        <p>One question per page, timer, flag questions, auto-submit, full review.</p>
        <div class="row">
          <span class="small muted">${lastMock ? `Last score: ${lastMock.score}/50` : "No mock yet"}</span>
          <a class="btn primary" href="#/exam">Take Exam</a>
        </div>
      </div>
    </div>

    <div style="margin-top:16px; border-top:1px solid var(--line); padding-top:14px;">
      <div class="badge">Quick tip</div>
      <p class="lead" style="margin-top:10px;">
        Use the search box (top-right) to find any word from sheets or questions.
        (Part 2 এ আমি search result page বানিয়ে দেব)
      </p>
    </div>
  `;
}

function renderPlaceholder(title, routeKey) {
  setActiveNav(routeKey);
  pageEl.innerHTML = `
    <h1 class="h1">${title}</h1>
    <p class="lead">This page will be built in the next part.</p>
    <div style="margin-top:12px" class="badge">Next: content + features</div>
  `;
}

// --- Router ---
async function router() {
  await loadData();

  const hash = location.hash || "#/home";
  const path = hash.replace("#", "").trim();

  // (Part 1) Routes
  if (path.startsWith("/home")) return renderHome();
  if (path.startsWith("/study")) return renderPlaceholder("📘 Study Sheets", "study");
  if (path.startsWith("/practice")) return renderPlaceholder("📝 Practice Questions", "practice");
  if (path.startsWith("/exam")) return renderPlaceholder("⏱️ Real Exam Mode", "exam");
  if (path.startsWith("/progress")) return renderPlaceholder("📈 Progress", "progress");
  if (path.startsWith("/resources")) return renderPlaceholder("🔗 Resources / FAQ", "resources");

  // fallback
  location.hash = "#/home";
}

// --- Global search input (Part 2 এ full search results দেখাব) ---
searchEl.addEventListener("input", (e) => {
  state.searchText = e.target.value.trim();
  // Part 2: show search results page
});

window.addEventListener("hashchange", router);
router();
