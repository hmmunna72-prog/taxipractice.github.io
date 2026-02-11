// ====== Simple SPA Router for GitHub Pages (hash routing) ======
const pageEl = document.getElementById("page");
const searchEl = document.getElementById("globalSearch");
const themeBtn = document.getElementById("toggleTheme");

const state = {
  sheets: null,
  questionsData: null,
  searchText: "",
  selectedChapterId: null,

  // practice runtime
  practice: {
    topic: "ALL",
    mode: "practice", // practice | quiz
    pool: [],         // question objects
    index: 0,
    selected: null,
    submitted: false,
    lastResult: null, // {correct:boolean, answer:"a", correct:"b"}
    show: 10,         // default pool size for Random
  }
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

// --- Theme toggle ---
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
  LS.set("theme_light", !LS.get("theme_light", false));
  applyTheme();
});
applyTheme();

// --- Load data ---
async function loadData() {
  if (state.sheets && state.questionsData) return;

  try {
    const [sheetsRes, questionsRes] = await Promise.all([
      fetch("./data/sheets.json"),
      fetch("./data/questions.json"),
    ]);

    state.sheets = await sheetsRes.json();
    state.questionsData = await questionsRes.json();

    // default chapter
    if (!state.selectedChapterId && state.sheets?.chapters?.length) {
      const last = LS.get("selected_chapter_id", null);
      state.selectedChapterId = last || state.sheets.chapters[0].id;
    }

    // init practice defaults
    if (!state.practice.pool.length) resetPracticePool();
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

// --- Progress storage ---
function getProgress() {
  return LS.get("progress", {
    studiedChapters: 0,
    practiceDone: 0,
    mockHistory: [],
    bookmarks: { chapters: [] },
    mistakes: [] // array of question ids
  });
}
function setProgress(p) {
  LS.set("progress", p);
}

// --- Utils ---
function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function includesText(hay, needle) {
  if (!needle) return false;
  return (hay || "").toLowerCase().includes(needle.toLowerCase());
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function parseQueryStringFromHash() {
  const hash = location.hash || "";
  const idx = hash.indexOf("?");
  if (idx === -1) return {};
  const qs = hash.slice(idx + 1);
  const params = new URLSearchParams(qs);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

// --- Home ---
function renderHome() {
  setActiveNav("home");
  const progress = getProgress();
  const lastMock = progress.mockHistory?.[0];

  pageEl.innerHTML = `
    <h1 class="h1">Welcome 👋</h1>
    <p class="lead">
      Study sheets, practice questions, and take a real-time mock exam.
      Everything saves automatically in your browser.
    </p>

    <div class="grid">
      <div class="card">
        <div class="badge">Study</div>
        <h3>📘 Study Sheets</h3>
        <p>Read the preparation sheet with chapters, easy translation, and bookmarks.</p>
        <div class="row">
          <span class="small muted">Bookmarked: ${progress.bookmarks.chapters.length}</span>
          <a class="btn primary" href="#/study">Open</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Practice</div>
        <h3>📝 Practice Questions</h3>
        <p>Topic-wise MCQ practice with instant answers & explanation.</p>
        <div class="row">
          <span class="small muted">Done: ${progress.practiceDone}</span>
          <a class="btn primary" href="#/practice">Start</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Mistakes</div>
        <h3>❌ Mistake Practice</h3>
        <p>Only the questions you got wrong — repeat until perfect.</p>
        <div class="row">
          <span class="small muted">Mistakes: ${progress.mistakes.length}</span>
          <a class="btn primary" href="#/mistakes">Open</a>
        </div>
      </div>
    </div>

    <div class="hr"></div>
    <div class="row-gap">
      <span class="badge">Search</span>
      <span class="small muted">Type in the top-right search box and press Enter.</span>
      <a class="chip" href="#/search?q=alcohol">Demo: alcohol</a>
      <a class="chip" href="#/search?q=taksi">Demo: taksi</a>
    </div>
  `;
}

// --- Study Sheets (from Part 2) ---
function renderStudy() {
  setActiveNav("study");

  const chapters = state.sheets?.chapters || [];
  if (!chapters.length) {
    pageEl.innerHTML = `
      <h1 class="h1">📘 Study Sheets</h1>
      <p class="lead">No chapters found in <code>data/sheets.json</code>.</p>
    `;
    return;
  }

  const progress = getProgress();
  const bookmarked = new Set(progress.bookmarks.chapters || []);
  const selected = chapters.find(c => c.id === state.selectedChapterId) || chapters[0];

  const chapterListHtml = chapters.map(c => {
    const isActive = c.id === selected.id;
    const isBm = bookmarked.has(c.id);
    return `
      <div class="item ${isActive ? "active" : ""}" data-chapter="${escapeHtml(c.id)}">
        <div class="row-gap" style="justify-content:space-between;">
          <div>
            <div style="font-weight:700">${escapeHtml(c.title)}</div>
            <div class="kicker mono">${escapeHtml(c.id)} • ${c.items?.length || 0} lines</div>
          </div>
          <div class="kicker">${isBm ? "⭐" : ""}</div>
        </div>
      </div>
    `;
  }).join("");

  const items = selected.items || [];
  const linesHtml = items.map((it) => {
    return `
      <div class="p">
        <span class="fi">${escapeHtml(it.fi || "")}</span>
        <span class="bn">${escapeHtml(it.bn || "")}</span>
        ${it.note ? `<div class="kicker mono">${escapeHtml(it.note)}</div>` : ""}
      </div>
    `;
  }).join("");

  const isBookmarked = bookmarked.has(selected.id);

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">📘 Study Sheets</h1>
        <p class="lead">Select a chapter from the left. Bookmark important chapters.</p>
      </div>
      <div class="row-gap">
        <button id="bookmarkChapter" class="btn ${isBookmarked ? "primary" : ""}" type="button">
          ${isBookmarked ? "⭐ Bookmarked" : "☆ Bookmark"}
        </button>
        <button id="printChapter" class="btn" type="button">🖨️ Print</button>
      </div>
    </div>

    <div class="two-col" style="margin-top:14px;">
      <div class="panel">
        <div class="row-gap" style="justify-content:space-between; margin-bottom:10px;">
          <div class="badge">Chapters</div>
          <div class="kicker">Total: ${chapters.length}</div>
        </div>
        <div id="chapterList" class="list">${chapterListHtml}</div>
      </div>

      <div class="panel">
        <div class="badge">Reading</div>
        <h2 class="h2" style="margin-top:10px;">${escapeHtml(selected.title)}</h2>
        <div class="kicker mono">Chapter ID: ${escapeHtml(selected.id)} • Lines: ${items.length}</div>

        <div class="hr"></div>
        <div id="chapterContent">${linesHtml || `<p class="lead">No content lines inside this chapter.</p>`}</div>
      </div>
    </div>
  `;

  document.getElementById("chapterList").addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    const id = item.getAttribute("data-chapter");
    state.selectedChapterId = id;
    LS.set("selected_chapter_id", id);
    renderStudy();
  });

  document.getElementById("bookmarkChapter").addEventListener("click", () => {
    const p = getProgress();
    const set = new Set(p.bookmarks.chapters || []);
    if (set.has(selected.id)) set.delete(selected.id);
    else set.add(selected.id);
    p.bookmarks.chapters = [...set];
    setProgress(p);
    renderStudy();
  });

  document.getElementById("printChapter").addEventListener("click", () => window.print());
}

// --- Search (from Part 2) ---
function renderSearch() {
  setActiveNav("");
  const params = parseQueryStringFromHash();
  const q = (params.q || state.searchText || "").trim();

  if (!q) {
    pageEl.innerHTML = `
      <h1 class="h1">🔎 Search</h1>
      <p class="lead">Type something in the top search box to search sheets and questions.</p>
    `;
    return;
  }

  const chapters = state.sheets?.chapters || [];
  const sheetHits = [];
  for (const ch of chapters) {
    const inTitle = includesText(ch.title, q) || includesText(ch.id, q);
    const matchedLines = (ch.items || []).filter(it =>
      includesText(it.fi, q) || includesText(it.bn, q) || includesText(it.note, q)
    );

    if (inTitle || matchedLines.length) {
      sheetHits.push({
        id: ch.id,
        title: ch.title,
        count: matchedLines.length,
        sample: matchedLines.slice(0, 2)
      });
    }
  }

  const qs = state.questionsData?.questions || [];
  const questionHits = [];
  for (const qu of qs) {
    const inQ = includesText(qu.question_fi, q) || includesText(qu.question_bn, q) || includesText(qu.topic, q);
    const inOpt = (qu.options || []).some(o => includesText(o.fi, q) || includesText(o.bn, q));
    if (inQ || inOpt) questionHits.push(qu);
  }

  const sheetHtml = sheetHits.length ? sheetHits.map(h => {
    const sampleHtml = (h.sample || []).map(s => `
      <div class="p" style="margin:8px 0 0;">
        <span class="fi">${escapeHtml(s.fi || "")}</span>
        <span class="bn">${escapeHtml(s.bn || "")}</span>
      </div>
    `).join("");

    return `
      <div class="item" data-open-chapter="${escapeHtml(h.id)}">
        <div style="font-weight:800">${escapeHtml(h.title)}</div>
        <div class="kicker mono">Chapter ${escapeHtml(h.id)} • matched lines: ${h.count}</div>
        ${sampleHtml}
        <div class="row-gap" style="margin-top:10px;">
          <span class="chip">Open chapter</span>
        </div>
      </div>
    `;
  }).join("") : `<p class="lead">No matches in sheets.</p>`;

  const qHtml = questionHits.length ? questionHits.slice(0, 20).map(qu => `
    <div class="item">
      <div class="row-gap" style="justify-content:space-between;">
        <div style="font-weight:800">${escapeHtml(qu.topic || "Topic")}</div>
        <div class="kicker mono">${escapeHtml(qu.id)}</div>
      </div>
      <div class="p" style="margin-top:8px;">
        <span class="fi">${escapeHtml(qu.question_fi || "")}</span>
        <span class="bn">${escapeHtml(qu.question_bn || "")}</span>
      </div>
      <div class="row-gap" style="margin-top:10px;">
        <a class="chip" href="#/practice?topic=${encodeURIComponent(qu.topic || "ALL")}">Practice this topic</a>
      </div>
    </div>
  `).join("") : `<p class="lead">No matches in questions.</p>`;

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">🔎 Search results</h1>
        <p class="lead">Query: <span class="mono">${escapeHtml(q)}</span></p>
      </div>
      <div class="row-gap">
        <span class="badge">Sheets: ${sheetHits.length}</span>
        <span class="badge">Questions: ${questionHits.length}</span>
      </div>
    </div>

    <div class="two-col" style="margin-top:14px;">
      <div class="panel">
        <div class="badge">📘 Sheet matches</div>
        <div class="hr"></div>
        <div id="sheetResults" class="list">${sheetHtml}</div>
      </div>

      <div class="panel">
        <div class="badge">📝 Question matches (top 20)</div>
        <div class="hr"></div>
        <div class="list">${qHtml}</div>
      </div>
    </div>
  `;

  document.getElementById("sheetResults")?.addEventListener("click", (e) => {
    const box = e.target.closest(".item");
    if (!box) return;
    const id = box.getAttribute("data-open-chapter");
    if (!id) return;
    state.selectedChapterId = id;
    LS.set("selected_chapter_id", id);
    location.hash = "#/study";
  });
}

// ===== Practice Logic =====
function getAllQuestions() {
  return state.questionsData?.questions || [];
}
function getTopics() {
  return state.questionsData?.topics || ["ALL"];
}

function resetPracticePool(custom = {}) {
  const { topic = state.practice.topic, size = state.practice.show } = custom;
  const all = getAllQuestions();
  const filtered = (topic === "ALL") ? all : all.filter(q => (q.topic || "") === topic);
  const pool = shuffle(filtered).slice(0, Math.max(1, Math.min(size, filtered.length || size)));

  state.practice.pool = pool;
  state.practice.index = 0;
  state.practice.selected = null;
  state.practice.submitted = false;
  state.practice.lastResult = null;
}

function currentQuestion() {
  return state.practice.pool[state.practice.index] || null;
}

function markMistake(questionId) {
  const p = getProgress();
  const set = new Set(p.mistakes || []);
  set.add(questionId);
  p.mistakes = [...set];
  setProgress(p);
}

function clearMistake(questionId) {
  const p = getProgress();
  p.mistakes = (p.mistakes || []).filter(id => id !== questionId);
  setProgress(p);
}

function incrementPracticeDone() {
  const p = getProgress();
  p.practiceDone = (p.practiceDone || 0) + 1;
  setProgress(p);
}

function renderPractice() {
  setActiveNav("practice");

  // read query param (topic=...)
  const params = parseQueryStringFromHash();
  const forcedTopic = params.topic ? decodeURIComponent(params.topic) : null;

  const topics = ["ALL", ...getTopics().filter(t => t !== "ALL")];
  if (forcedTopic && topics.includes(forcedTopic) && state.practice.topic !== forcedTopic) {
    state.practice.topic = forcedTopic;
    resetPracticePool({ topic: forcedTopic });
  }

  const allQs = getAllQuestions();
  if (!allQs.length) {
    pageEl.innerHTML = `
      <h1 class="h1">📝 Practice Questions</h1>
      <p class="lead">No questions found in <code>data/questions.json</code>.</p>
    `;
    return;
  }

  // ensure pool exists
  if (!state.practice.pool.length) resetPracticePool();

  const q = currentQuestion();
  if (!q) {
    pageEl.innerHTML = `
      <h1 class="h1">📝 Practice Questions</h1>
      <p class="lead">No questions available for this topic.</p>
      <div class="row-gap" style="margin-top:12px;">
        <a class="btn primary" href="#/practice">Back</a>
      </div>
    `;
    return;
  }

  const progress = getProgress();
  const isMistake = (progress.mistakes || []).includes(q.id);

  const optionHtml = (q.options || []).map(opt => {
    const checked = state.practice.selected === opt.id ? "checked" : "";
    let cls = "option";
    if (state.practice.submitted) {
      if (opt.id === q.answer) cls += " correct";
      else if (opt.id === state.practice.selected && opt.id !== q.answer) cls += " wrong";
    }
    return `
      <label class="${cls}">
        <input type="radio" name="opt" value="${escapeHtml(opt.id)}" ${checked} ${state.practice.submitted ? "disabled" : ""}/>
        <div>
          <div class="fi">${escapeHtml(opt.fi || "")}</div>
          <div class="bn kicker">${escapeHtml(opt.bn || "")}</div>
        </div>
      </label>
    `;
  }).join("");

  const idx = state.practice.index + 1;
  const total = state.practice.pool.length;

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">📝 Practice Questions</h1>
        <p class="lead">Topic-wise practice with instant answer + explanation.</p>
      </div>
      <div class="row-gap">
        <span class="badge">Done: ${progress.practiceDone}</span>
        <a class="btn" href="#/mistakes">❌ Mistakes (${progress.mistakes.length})</a>
      </div>
    </div>

    <div class="controls">
      <div class="row-gap">
        <label class="kicker">Topic</label>
        <select id="topicSel" class="select">
          ${topics.map(t => `<option value="${escapeHtml(t)}" ${t === state.practice.topic ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
        </select>

        <label class="kicker">Mode</label>
        <select id="modeSel" class="select">
          <option value="practice" ${state.practice.mode === "practice" ? "selected" : ""}>Practice (instant)</option>
          <option value="quiz" ${state.practice.mode === "quiz" ? "selected" : ""}>Quiz (no hint)</option>
        </select>

        <label class="kicker">Random</label>
        <select id="sizeSel" class="select">
          ${[10,20,30,50].map(n => `<option value="${n}" ${n === state.practice.show ? "selected" : ""}>${n} questions</option>`).join("")}
        </select>

        <button id="newSet" class="btn" type="button">🔁 New set</button>
      </div>

      <div class="row-gap">
        <span class="badge">Question: ${idx}/${total}</span>
        <span class="badge">${escapeHtml(q.topic || "Topic")}</span>
        <span class="badge">${isMistake ? "❌ Marked mistake" : "✅ Not mistake"}</span>
      </div>
    </div>

    <div class="qbox">
      <div class="kicker mono">${escapeHtml(q.id)} • ${escapeHtml(q.type || "mcq")}</div>
      <div class="p" style="margin-top:8px;">
        <span class="fi">${escapeHtml(q.question_fi || "")}</span>
        <span class="bn">${escapeHtml(q.question_bn || "")}</span>
      </div>

      <div id="opts">${optionHtml}</div>

      <div class="row-gap" style="margin-top:14px; justify-content:space-between;">
        <div class="row-gap">
          <button id="submitBtn" class="btn primary" type="button" ${state.practice.submitted ? "disabled" : ""}>Submit</button>
          <button id="nextBtn" class="btn" type="button" ${state.practice.submitted ? "" : "disabled"}>Next ▶</button>
          <button id="skipBtn" class="btn" type="button" ${state.practice.submitted ? "disabled" : ""}>Skip</button>
        </div>
        <div class="row-gap">
          <button id="toggleMistake" class="btn" type="button">
            ${isMistake ? "Remove from mistakes" : "Add to mistakes"}
          </button>
        </div>
      </div>

      <div id="feedback"></div>
    </div>
  `;

  // option select
  document.getElementById("opts").addEventListener("change", (e) => {
    const r = e.target.closest("input[type=radio]");
    if (!r) return;
    state.practice.selected = r.value;
  });

  // controls
  document.getElementById("topicSel").addEventListener("change", (e) => {
    state.practice.topic = e.target.value;
    resetPracticePool({ topic: state.practice.topic, size: state.practice.show });
    renderPractice();
  });

  document.getElementById("modeSel").addEventListener("change", (e) => {
    state.practice.mode = e.target.value;
    renderPractice();
  });

  document.getElementById("sizeSel").addEventListener("change", (e) => {
    state.practice.show = Number(e.target.value);
    resetPracticePool({ topic: state.practice.topic, size: state.practice.show });
    renderPractice();
  });

  document.getElementById("newSet").addEventListener("click", () => {
    resetPracticePool({ topic: state.practice.topic, size: state.practice.show });
    renderPractice();
  });

  // mistake toggle
  document.getElementById("toggleMistake").addEventListener("click", () => {
    const p = getProgress();
    const set = new Set(p.mistakes || []);
    if (set.has(q.id)) set.delete(q.id);
    else set.add(q.id);
    p.mistakes = [...set];
    setProgress(p);
    renderPractice();
  });

  // submit
  document.getElementById("submitBtn").addEventListener("click", () => {
    if (!state.practice.selected) {
      document.getElementById("feedback").innerHTML = `<div class="alert">⚠️ Please select an option first.</div>`;
      return;
    }

    state.practice.submitted = true;
    const correct = state.practice.selected === q.answer;
    state.practice.lastResult = { correct, answer: state.practice.selected, correctId: q.answer };

    incrementPracticeDone();

    if (!correct) markMistake(q.id);
    else clearMistake(q.id);

    // feedback + explanation
    const showExplain = (state.practice.mode === "practice");
    const explainHtml = showExplain ? `
      <div class="alert">
        <div class="row-gap" style="justify-content:space-between;">
          <div style="font-weight:800">${correct ? "✅ Correct" : "❌ Wrong"}</div>
          <div class="kicker mono">Correct: ${escapeHtml(q.answer)}</div>
        </div>
        <div class="hr"></div>
        <div class="split">
          <div>
            <div class="kicker">Explanation (FI)</div>
            <div class="p"><span class="fi">${escapeHtml(q.explain_fi || "—")}</span></div>
          </div>
          <div>
            <div class="kicker">Explanation (BN)</div>
            <div class="p"><span class="fi">${escapeHtml(q.explain_bn || "—")}</span></div>
          </div>
        </div>
      </div>
    ` : `
      <div class="alert">
        <div style="font-weight:800">${correct ? "✅ Correct" : "❌ Wrong"}</div>
        <div class="kicker">Quiz mode: explanation hidden. Switch to Practice mode to see explanation.</div>
      </div>
    `;

    document.getElementById("feedback").innerHTML = explainHtml;
    renderPractice(); // re-render to show correct/wrong highlighting + enable Next
  });

  // next
  document.getElementById("nextBtn").addEventListener("click", () => {
    state.practice.index = Math.min(state.practice.index + 1, state.practice.pool.length);
    state.practice.selected = null;
    state.practice.submitted = false;
    state.practice.lastResult = null;

    if (state.practice.index >= state.practice.pool.length) {
      // finished set
      pageEl.innerHTML = `
        <h1 class="h1">✅ Set finished</h1>
        <p class="lead">You completed this practice set.</p>
        <div class="row-gap" style="margin-top:12px;">
          <button id="again" class="btn primary" type="button">🔁 New set</button>
          <a class="btn" href="#/mistakes">❌ Practice mistakes</a>
          <a class="btn" href="#/home">🏠 Home</a>
        </div>
      `;
      document.getElementById("again").addEventListener("click", () => {
        resetPracticePool({ topic: state.practice.topic, size: state.practice.show });
        renderPractice();
      });
      return;
    }

    renderPractice();
  });

  // skip
  document.getElementById("skipBtn").addEventListener("click", () => {
    state.practice.index = Math.min(state.practice.index + 1, state.practice.pool.length - 1);
    state.practice.selected = null;
    state.practice.submitted = false;
    state.practice.lastResult = null;
    renderPractice();
  });
}

// --- Mistakes page ---
function renderMistakes() {
  setActiveNav(""); // no sidebar active
  const p = getProgress();
  const all = getAllQuestions();
  const mistakeIds = p.mistakes || [];
  const mistakes = all.filter(q => mistakeIds.includes(q.id));

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">❌ Mistakes</h1>
        <p class="lead">These are the questions you answered wrong. Practice them until perfect.</p>
      </div>
      <div class="row-gap">
        <span class="badge">Total mistakes: ${mistakes.length}</span>
        <button id="clearAll" class="btn" type="button">Clear all</button>
      </div>
    </div>

    <div class="hr"></div>

    <div class="row-gap" style="margin-bottom:10px;">
      <button id="practiceMistakes" class="btn primary" type="button" ${mistakes.length ? "" : "disabled"}>Practice mistakes now</button>
      <a class="btn" href="#/practice">Go to Practice</a>
    </div>

    <div class="panel">
      <div class="badge">Mistake list</div>
      <div class="hr"></div>
      <div class="list">
        ${
          mistakes.length
            ? mistakes.map(q => `
              <div class="item">
                <div class="row-gap" style="justify-content:space-between;">
                  <div style="font-weight:800">${escapeHtml(q.topic || "Topic")}</div>
                  <div class="kicker mono">${escapeHtml(q.id)}</div>
                </div>
                <div class="p" style="margin-top:8px;">
                  <span class="fi">${escapeHtml(q.question_fi || "")}</span>
                  <span class="bn">${escapeHtml(q.question_bn || "")}</span>
                </div>
                <div class="row-gap" style="margin-top:10px;">
                  <button class="btn" data-remove="${escapeHtml(q.id)}" type="button">Remove</button>
                </div>
              </div>
            `).join("")
            : `<p class="lead">No mistakes yet. Start practicing!</p>`
        }
      </div>
    </div>
  `;

  document.getElementById("clearAll").addEventListener("click", () => {
    const p2 = getProgress();
    p2.mistakes = [];
    setProgress(p2);
    renderMistakes();
  });

  document.getElementById("practiceMistakes").addEventListener("click", () => {
    // build pool from mistakes and jump to practice
    state.practice.topic = "ALL";
    state.practice.show = Math.max(10, mistakes.length);
    state.practice.pool = shuffle(mistakes);
    state.practice.index = 0;
    state.practice.selected = null;
    state.practice.submitted = false;
    state.practice.lastResult = null;
    location.hash = "#/practice";
  });

  pageEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove]");
    if (!btn) return;
    const id = btn.getAttribute("data-remove");
    const p2 = getProgress();
    p2.mistakes = (p2.mistakes || []).filter(x => x !== id);
    setProgress(p2);
    renderMistakes();
  });
}

// --- Placeholder pages (Part 4+ will build) ---
function renderPlaceholder(title, routeKey) {
  setActiveNav(routeKey);
  pageEl.innerHTML = `
    <h1 class="h1">${title}</h1>
    <p class="lead">This page will be built in the next part.</p>
    <div class="badge" style="margin-top:12px;">Next: content + features</div>
  `;
}

// --- Router ---
async function router() {
  await loadData();

  const hash = location.hash || "#/home";
  const path = hash.replace("#", "").trim();

  if (path.startsWith("/home")) return renderHome();
  if (path.startsWith("/study")) return renderStudy();
  if (path.startsWith("/search")) return renderSearch();
  if (path.startsWith("/practice")) return renderPractice();
  if (path.startsWith("/mistakes")) return renderMistakes();

  // Part 4+
  if (path.startsWith("/exam")) return renderPlaceholder("⏱️ Real Exam Mode", "exam");
  if (path.startsWith("/progress")) return renderPlaceholder("📈 Progress", "progress");
  if (path.sta
