// ===== Taxi Exam Prep SPA (Hash Router) =====
const pageEl = document.getElementById("page");
const searchEl = document.getElementById("globalSearch");
const themeBtn = document.getElementById("toggleTheme");

let examTimerHandle = null;

const state = {
  sheets: null,
  questionsData: null,
  searchText: "",
  selectedChapterId: null,

  practice: {
    topic: "ALL",
    mode: "practice",
    pool: [],
    index: 0,
    selected: null,
    submitted: false,
    show: 10,
  },

  exam: {
    active: false,
    durationSec: 50 * 60,
    endAt: null,
    startedAt: null,
    index: 0,
    pool: [],
    answers: {},
    flagged: {},
    submitted: false,
    result: null,
  }
};

// ---------- localStorage ----------
const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

// ---------- theme ----------
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

// ---------- helpers ----------
function setActiveNav(route) {
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}
function escapeHtml(s="") {
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
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
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function nowMs() { return Date.now(); }

// ---------- progress ----------
function getProgress() {
  return LS.get("progress", {
    practiceDone: 0,
    bookmarks: { chapters: [] },
    mistakes: [],
    mockHistory: []
  });
}
function setProgress(p) { LS.set("progress", p); }
function incPracticeDone() {
  const p = getProgress();
  p.practiceDone = (p.practiceDone || 0) + 1;
  setProgress(p);
}
function markMistake(id) {
  const p = getProgress();
  const set = new Set(p.mistakes || []);
  set.add(id);
  p.mistakes = [...set];
  setProgress(p);
}
function clearMistake(id) {
  const p = getProgress();
  p.mistakes = (p.mistakes || []).filter(x => x !== id);
  setProgress(p);
}

// ---------- data ----------
async function loadData() {
  if (state.sheets && state.questionsData) return;

  const [sheetsRes, questionsRes] = await Promise.all([
    fetch("./data/sheets.json"),
    fetch("./data/questions.json"),
  ]);

  if (!sheetsRes.ok) throw new Error("Cannot load sheets.json");
  if (!questionsRes.ok) throw new Error("Cannot load questions.json");

  state.sheets = await sheetsRes.json();
  state.questionsData = await questionsRes.json();

  if (!state.selectedChapterId && state.sheets?.chapters?.length) {
    state.selectedChapterId = state.sheets.chapters[0].id;
  }

  if (!state.practice.pool.length) resetPracticePool();
}

function getAllQuestions() { return state.questionsData?.questions || []; }
function getTopics() { return state.questionsData?.topics || []; }

// ---------- pages ----------
function renderHome() {
  setActiveNav("home");
  const p = getProgress();
  const last = p.mockHistory?.[0];

  pageEl.innerHTML = `
    <h1 class="h1">Welcome 👋</h1>
    <p class="lead">Study sheets, practice questions, and take a real-time mock exam.</p>

    <div class="grid">
      <div class="card">
        <div class="badge">Study</div>
        <h3>📘 Study Sheets</h3>
        <p>Read chapters with FI + BN.</p>
        <div class="row">
          <span class="small muted">Chapters: ${(state.sheets?.chapters?.length || 0)}</span>
          <a class="btn primary" href="#/study">Open</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Practice</div>
        <h3>📝 Practice Questions</h3>
        <p>Topic-wise MCQ practice with explanation.</p>
        <div class="row">
          <span class="small muted">Done: ${p.practiceDone}</span>
          <a class="btn primary" href="#/practice">Start</a>
        </div>
      </div>

      <div class="card">
        <div class="badge">Real Exam</div>
        <h3>⏱️ 50Q / 50min</h3>
        <p>Timer + navigator + review.</p>
        <div class="row">
          <span class="small muted">${last ? `Last: ${last.score}/${last.total}` : "No mock yet"}</span>
          <a class="btn primary" href="#/exam">Start</a>
        </div>
      </div>
    </div>
  `;
}

function renderStudy() {
  setActiveNav("study");
  const chapters = state.sheets?.chapters || [];
  if (!chapters.length) {
    pageEl.innerHTML = `<h1 class="h1">📘 Study Sheets</h1><p class="lead">No chapters found.</p>`;
    return;
  }

  const progress = getProgress();
  const bookmarked = new Set(progress.bookmarks.chapters || []);
  const selected = chapters.find(c => c.id === state.selectedChapterId) || chapters[0];

  const listHtml = chapters.map(c => {
    const active = c.id === selected.id;
    const star = bookmarked.has(c.id) ? "⭐" : "";
    return `
      <div class="item ${active ? "active" : ""}" data-chapter="${escapeHtml(c.id)}">
        <div style="font-weight:800">${escapeHtml(c.title)}</div>
        <div class="kicker mono">${escapeHtml(c.id)} • ${(c.items?.length || 0)} lines ${star}</div>
      </div>
    `;
  }).join("");

  const contentHtml = (selected.items || []).map(it => `
    <div class="p">
      <span class="fi">${escapeHtml(it.fi || "")}</span>
      <span class="bn">${escapeHtml(it.bn || "")}</span>
      ${it.note ? `<div class="kicker mono">${escapeHtml(it.note)}</div>` : ""}
    </div>
  `).join("");

  const isBm = bookmarked.has(selected.id);

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">📘 Study Sheets</h1>
        <p class="lead">Select a chapter. Bookmark important chapters.</p>
      </div>
      <div class="row-gap">
        <button id="bmBtn" class="btn ${isBm ? "primary" : ""}" type="button">${isBm ? "⭐ Bookmarked" : "☆ Bookmark"}</button>
      </div>
    </div>

    <div class="two-col" style="margin-top:14px;">
      <div class="panel">
        <div class="badge">Chapters</div>
        <div class="hr"></div>
        <div id="chapterList" class="list">${listHtml}</div>
      </div>

      <div class="panel">
        <div class="badge">Reading</div>
        <h2 class="h2" style="margin-top:10px;">${escapeHtml(selected.title)}</h2>
        <div class="kicker mono">ID: ${escapeHtml(selected.id)}</div>
        <div class="hr"></div>
        ${contentHtml || `<p class="lead">No content lines.</p>`}
      </div>
    </div>
  `;

  document.getElementById("chapterList").addEventListener("click", (e) => {
    const it = e.target.closest(".item");
    if (!it) return;
    state.selectedChapterId = it.getAttribute("data-chapter");
    renderStudy();
  });

  document.getElementById("bmBtn").addEventListener("click", () => {
    const p = getProgress();
    const set = new Set(p.bookmarks.chapters || []);
    if (set.has(selected.id)) set.delete(selected.id);
    else set.add(selected.id);
    p.bookmarks.chapters = [...set];
    setProgress(p);
    renderStudy();
  });
}

function resetPracticePool({ topic = state.practice.topic, size = state.practice.show } = {}) {
  const all = getAllQuestions();
  const filtered = (topic === "ALL") ? all : all.filter(q => q.topic === topic);
  state.practice.pool = shuffle(filtered).slice(0, Math.max(1, Math.min(size, filtered.length || size)));
  state.practice.index = 0;
  state.practice.selected = null;
  state.practice.submitted = false;
}

function renderPractice() {
  setActiveNav("practice");

  const all = getAllQuestions();
  if (!all.length) {
    pageEl.innerHTML = `<h1 class="h1">📝 Practice Questions</h1><p class="lead">No questions found.</p>`;
    return;
  }

  const params = parseQueryStringFromHash();
  const forcedTopic = params.topic ? decodeURIComponent(params.topic) : null;
  const topics = ["ALL", ...getTopics().filter(t => t !== "ALL")];

  if (forcedTopic && topics.includes(forcedTopic) && state.practice.topic !== forcedTopic) {
    state.practice.topic = forcedTopic;
    resetPracticePool({ topic: forcedTopic });
  }

  if (!state.practice.pool.length) resetPracticePool();
  const q = state.practice.pool[state.practice.index];
  const progress = getProgress();
  const isMistake = (progress.mistakes || []).includes(q.id);

  const opts = (q.options || []).map(opt => {
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

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">📝 Practice Questions</h1>
        <p class="lead">Submit to see correct/wrong + explanation.</p>
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

        <label class="kicker">Random</label>
        <select id="sizeSel" class="select">
          ${[10,20,30,50].map(n => `<option value="${n}" ${n === state.practice.show ? "selected" : ""}>${n} questions</option>`).join("")}
        </select>

        <button id="newSet" class="btn" type="button">🔁 New set</button>
      </div>

      <div class="row-gap">
        <span class="badge">Q: ${state.practice.index + 1}/${state.practice.pool.length}</span>
        <span class="badge">${escapeHtml(q.topic || "Topic")}</span>
        <span class="badge">${isMistake ? "❌ Mistake" : "✅ OK"}</span>
      </div>
    </div>

    <div class="qbox">
      <div class="kicker mono">${escapeHtml(q.id)}</div>
      <div class="p" style="margin-top:8px;">
        <span class="fi">${escapeHtml(q.question_fi || "")}</span>
        <span class="bn">${escapeHtml(q.question_bn || "")}</span>
      </div>

      <div id="opts">${opts}</div>

      <div class="row-gap" style="margin-top:14px; justify-content:space-between;">
        <div class="row-gap">
          <button id="submitBtn" class="btn primary" type="button" ${state.practice.submitted ? "disabled" : ""}>Submit</button>
          <button id="nextBtn" class="btn" type="button" ${state.practice.submitted ? "" : "disabled"}>Next ▶</button>
        </div>
        <button id="toggleMistake" class="btn" type="button">${isMistake ? "Remove mistake" : "Add mistake"}</button>
      </div>

      <div id="feedback"></div>
    </div>
  `;

  document.getElementById("opts").addEventListener("change", (e) => {
    const r = e.target.closest("input[type=radio]");
    if (!r) return;
    state.practice.selected = r.value;
  });

  document.getElementById("topicSel").addEventListener("change", (e) => {
    state.practice.topic = e.target.value;
    resetPracticePool({ topic: state.practice.topic, size: state.practice.show });
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

  document.getElementById("toggleMistake").addEventListener("click", () => {
    const p = getProgress();
    const set = new Set(p.mistakes || []);
    if (set.has(q.id)) set.delete(q.id); else set.add(q.id);
    p.mistakes = [...set];
    setProgress(p);
    renderPractice();
  });

  document.getElementById("submitBtn").addEventListener("click", () => {
    if (!state.practice.selected) {
      document.getElementById("feedback").innerHTML = `<div class="alert">⚠️ Select an option first.</div>`;
      return;
    }
    state.practice.submitted = true;

    const correct = state.practice.selected === q.answer;
    incPracticeDone();
    if (!correct) markMistake(q.id); else clearMistake(q.id);

    document.getElementById("feedback").innerHTML = `
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
    `;
    renderPractice();
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    state.practice.index = Math.min(state.practice.index + 1, state.practice.pool.length - 1);
    state.practice.selected = null;
    state.practice.submitted = false;
    renderPractice();
  });
}

function renderMistakes() {
  setActiveNav("");
  const p = getProgress();
  const all = getAllQuestions();
  const mistakes = all.filter(q => (p.mistakes || []).includes(q.id));

  pageEl.innerHTML = `
    <h1 class="h1">❌ Mistakes</h1>
    <p class="lead">Only your wrong questions.</p>
    <div class="hr"></div>
    <div class="row-gap">
      <a class="btn" href="#/practice">Back to Practice</a>
      <button id="clearAll" class="btn" type="button">Clear all</button>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="badge">Mistake list (${mistakes.length})</div>
      <div class="hr"></div>
      <div class="list">
        ${mistakes.length ? mistakes.map(q => `
          <div class="item">
            <div style="font-weight:800">${escapeHtml(q.topic || "Topic")} • <span class="mono">${escapeHtml(q.id)}</span></div>
            <div class="p" style="margin-top:8px;">
              <span class="fi">${escapeHtml(q.question_fi || "")}</span>
              <span class="bn">${escapeHtml(q.question_bn || "")}</span>
            </div>
          </div>
        `).join("") : `<p class="lead">No mistakes yet.</p>`}
      </div>
    </div>
  `;

  document.getElementById("clearAll").addEventListener("click", () => {
    const p2 = getProgress();
    p2.mistakes = [];
    setProgress(p2);
    renderMistakes();
  });
}

// ---------- Exam ----------
function saveExamState() { LS.set("exam_state", state.exam); }
function clearExamState() { LS.set("exam_state", null); }

function buildExamPool() {
  const all = getAllQuestions();
  return shuffle(all).slice(0, Math.min(50, all.length));
}
function startExam() {
  const pool = buildExamPool();
  const start = nowMs();
  state.exam = {
    active: true,
    durationSec: 50 * 60,
    startedAt: start,
    endAt: start + (50 * 60 * 1000),
    index: 0,
    pool,
    answers: {},
    flagged: {},
    submitted: false,
    result: null,
  };
  saveExamState();
}
function stopExamTimer() {
  if (examTimerHandle) { clearInterval(examTimerHandle); examTimerHandle = null; }
}
function examLeftSec() {
  if (!state.exam.active || !state.exam.endAt) return 0;
  return Math.max(0, Math.floor((state.exam.endAt - nowMs()) / 1000));
}
function startExamTick(update) {
  stopExamTimer();
  examTimerHandle = setInterval(() => {
    const left = examLeftSec();
    if (left <= 0) { submitExam(true); return; }
    update?.();
    saveExamState();
  }, 500);
}
function submitExam(auto=false) {
  if (!state.exam.active || state.exam.submitted) return;

  let score = 0;
  const total = state.exam.pool.length;

  for (const q of state.exam.pool) {
    const ans = state.exam.answers[q.id];
    if (ans && ans === q.answer) score++;
  }

  state.exam.submitted = true;
  state.exam.result = { score, total, auto };
  stopExamTimer();
  saveExamState();

  const p = getProgress();
  p.mockHistory = [{
    dateISO: new Date().toISOString(),
    score,
    total,
    timeSec: Math.min(state.exam.durationSec, Math.floor((nowMs() - state.exam.startedAt)/1000))
  }, ...(p.mockHistory || [])].slice(0, 20);
  setProgress(p);

  location.hash = "#/exam-result";
}
function endExamReset() {
  stopExamTimer();
  state.exam = {
    active: false, durationSec: 50*60, endAt:null, startedAt:null,
    index:0, pool:[], answers:{}, flagged:{}, submitted:false, result:null
  };
  clearExamState();
}

function renderExamStart() {
  setActiveNav("exam");

  const running = state.exam.active && !state.exam.submitted && state.exam.endAt > nowMs();

  pageEl.innerHTML = `
    <h1 class="h1">⏱️ Real Exam</h1>
    <p class="lead">50 questions • 50 minutes • one question per page • flag + navigator.</p>
    <div class="hr"></div>
    <div class="row-gap">
      ${running ? `<a class="btn primary" href="#/exam-run">▶ Continue exam</a>` : `<button id="startBtn" class="btn primary" type="button">▶ Start new exam</button>`}
      <a class="btn" href="#/home">Home</a>
    </div>
  `;

  if (!running) {
    document.getElementById("startBtn").addEventListener("click", () => {
      startExam();
      location.hash = "#/exam-run";
    });
  }
}

function renderExamRun() {
  setActiveNav("exam");

  if (!state.exam.active || state.exam.submitted || state.exam.endAt <= nowMs()) {
    location.hash = "#/exam";
    return;
  }

  const q = state.exam.pool[state.exam.index];
  const total = state.exam.pool.length;

  const dots = state.exam.pool.map((qq, i) => {
    const isCurrent = i === state.exam.index;
    const isAnswered = !!state.exam.answers[qq.id];
    const isFlagged = !!state.exam.flagged[qq.id];

    let cls = "dot";
    if (isCurrent) cls += " current";
    if (isAnswered) cls += " answered";
    if (isFlagged) cls += " flagged";
    return `<div class="${cls}" data-jump="${i}">${i+1}</div>`;
  }).join("");

  const selected = state.exam.answers[q.id] || null;

  const opts = (q.options || []).map(opt => `
    <label class="option">
      <input type="radio" name="examOpt" value="${escapeHtml(opt.id)}" ${selected===opt.id ? "checked" : ""}/>
      <div>
        <div class="fi">${escapeHtml(opt.fi || "")}</div>
        <div class="bn kicker">${escapeHtml(opt.bn || "")}</div>
      </div>
    </label>
  `).join("");

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">⏱️ Exam Running</h1>
        <p class="lead">Question ${state.exam.index+1}/${total}</p>
      </div>
      <div class="timer" id="timer">⏳ ${formatTime(examLeftSec())}</div>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="row-gap" style="justify-content:space-between;">
        <div class="badge">Navigator</div>
        <div class="row-gap">
          <button id="flagBtn" class="btn ${state.exam.flagged[q.id] ? "primary" : ""}" type="button">${state.exam.flagged[q.id] ? "🚩 Flagged" : "🏳️ Flag"}</button>
          <button id="submitExam" class="btn" type="button">Submit</button>
        </div>
      </div>
      <div class="dots" id="dots">${dots}</div>
    </div>

    <div class="qbox">
      <div class="kicker mono">${escapeHtml(q.id)} • ${escapeHtml(q.topic || "Topic")}</div>
      <div class="p" style="margin-top:8px;">
        <span class="fi">${escapeHtml(q.question_fi || "")}</span>
        <span class="bn">${escapeHtml(q.question_bn || "")}</span>
      </div>

      <div id="examOpts">${opts}</div>

      <div class="row-gap" style="margin-top:14px; justify-content:space-between;">
        <button id="prevQ" class="btn" type="button" ${state.exam.index===0 ? "disabled" : ""}>◀ Back</button>
        <button id="nextQ" class="btn primary" type="button" ${state.exam.index===total-1 ? "disabled" : ""}>Next ▶</button>
        <button id="endExam" class="btn" type="button">End</button>
      </div>
    </div>
  `;

  startExamTick(() => {
    const t = document.getElementById("timer");
    if (t) t.textContent = `⏳ ${formatTime(examLeftSec())}`;
  });

  document.getElementById("examOpts").addEventListener("change", (e) => {
    const r = e.target.closest("input[type=radio]");
    if (!r) return;
    state.exam.answers[q.id] = r.value;
    saveExamState();
    renderExamRun();
  });

  document.getElementById("dots").addEventListener("click", (e) => {
    const d = e.target.closest(".dot");
    if (!d) return;
    const jump = Number(d.getAttribute("data-jump"));
    state.exam.index = Math.max(0, Math.min(jump, total-1));
    saveExamState();
    renderExamRun();
  });

  document.getElementById("flagBtn").addEventListener("click", () => {
    state.exam.flagged[q.id] = !state.exam.flagged[q.id];
    if (!state.exam.flagged[q.id]) delete state.exam.flagged[q.id];
    saveExamState();
    renderExamRun();
  });

  document.getElementById("prevQ").addEventListener("click", () => {
    state.exam.index = Math.max(0, state.exam.index-1);
    saveExamState();
    renderExamRun();
  });

  document.getElementById("nextQ").addEventListener("click", () => {
    state.exam.index = Math.min(total-1, state.exam.index+1);
    saveExamState();
    renderExamRun();
  });

  document.getElementById("submitExam").addEventListener("click", () => submitExam(false));
  document.getElementById("endExam").addEventListener("click", () => { endExamReset(); location.hash="#/exam"; });
}

function renderExamResult() {
  setActiveNav("exam");
  if (!state.exam.submitted || !state.exam.result) { location.hash="#/exam"; return; }

  const r = state.exam.result;

  pageEl.innerHTML = `
    <h1 class="h1">✅ Exam Result</h1>
    <p class="lead">${r.auto ? "Auto-submitted (time ended)." : "Submitted."}</p>
    <div class="hr"></div>
    <div class="score">${r.score}/${r.total}</div>
    <div class="row-gap" style="margin-top:12px;">
      <a class="btn primary" href="#/exam-review">Review</a>
      <button id="newExam" class="btn" type="button">Start new</button>
      <a class="btn" href="#/home">Home</a>
    </div>
  `;

  document.getElementById("newExam").addEventListener("click", () => {
    endExamReset();
    startExam();
    location.hash="#/exam-run";
  });
}

function renderExamReview() {
  setActiveNav("exam");
  if (!state.exam.submitted || !state.exam.result) { location.hash="#/exam"; return; }

  const cards = state.exam.pool.map((q, i) => {
    const userAns = state.exam.answers[q.id] || null;
    const isCorrect = userAns && userAns === q.answer;

    const pill = isCorrect
      ? `<span class="pill good">Correct</span>`
      : (userAns ? `<span class="pill bad">Wrong</span>` : `<span class="pill warn">Unanswered</span>`);

    const opts = (q.options || []).map(opt => {
      let cls = "option";
      if (opt.id === q.answer) cls += " correct";
      if (userAns === opt.id && opt.id !== q.answer) cls += " wrong";
      return `
        <div class="${cls}" style="cursor:default;">
          <div class="mono" style="min-width:22px;">${escapeHtml(opt.id)}</div>
          <div>
            <div class="fi">${escapeHtml(opt.fi || "")}</div>
            <div class="bn kicker">${escapeHtml(opt.bn || "")}</div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="review-card">
        <div class="row-gap" style="justify-content:space-between;">
          <div class="row-gap">
            <span class="badge">#${i+1}</span>
            <span class="badge mono">${escapeHtml(q.id)}</span>
            <span class="badge">${escapeHtml(q.topic || "Topic")}</span>
            ${state.exam.flagged[q.id] ? `<span class="pill warn">Flagged</span>` : ""}
          </div>
          ${pill}
        </div>
        <div class="hr"></div>
        <div class="p">
          <span class="fi">${escapeHtml(q.question_fi || "")}</span>
          <span class="bn">${escapeHtml(q.question_bn || "")}</span>
        </div>
        <div class="hr"></div>
        ${opts}
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
    `;
  }).join("");

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <div>
        <h1 class="h1">📖 Review</h1>
        <p class="lead">Green = correct answer. Red = your wrong selection.</p>
      </div>
      <div class="row-gap">
        <a class="btn" href="#/exam-result">Back</a>
        <button id="resetExam" class="btn" type="button">Reset exam</button>
      </div>
    </div>
    <div class="hr"></div>
    ${cards}
  `;

  document.getElementById("resetExam").addEventListener("click", () => {
    endExamReset();
    location.hash="#/exam";
  });
}

function renderProgress() {
  setActiveNav("progress");
  const p = getProgress();
  const last = p.mockHistory?.[0];
  pageEl.innerHTML = `
    <h1 class="h1">📈 Progress</h1>
    <p class="lead">Practice done: ${p.practiceDone} • Mistakes: ${p.mistakes.length}</p>
    <div class="hr"></div>
    <p class="lead">${last ? `Last mock: ${last.score}/${last.total}` : "No mock yet."}</p>
  `;
}

function renderResources() {
  setActiveNav("resources");
  pageEl.innerHTML = `
    <h1 class="h1">🔗 Resources / FAQ</h1>
    <p class="lead">Add your useful links here later.</p>
  `;
}

// ---------- search ----------
function renderSearch() {
  setActiveNav("");
  const params = parseQueryStringFromHash();
  const q = (params.q || state.searchText || "").trim();
  if (!q) {
    pageEl.innerHTML = `<h1 class="h1">🔎 Search</h1><p class="lead">Type in top search box and press Enter.</p>`;
    return;
  }

  const chapters = state.sheets?.chapters || [];
  const sheetHits = [];
  for (const ch of chapters) {
    const matched = (ch.items || []).filter(it =>
      includesText(it.fi, q) || includesText(it.bn, q) || includesText(it.note, q)
    );
    if (includesText(ch.title, q) || matched.length) sheetHits.push({ id: ch.id, title: ch.title, sample: matched.slice(0,2) });
  }

  const qs = getAllQuestions();
  const qHits = qs.filter(qu =>
    includesText(qu.question_fi, q) || includesText(qu.question_bn, q) || includesText(qu.topic, q) ||
    (qu.options || []).some(o => includesText(o.fi, q) || includesText(o.bn, q))
  ).slice(0, 20);

  pageEl.innerHTML = `
    <h1 class="h1">🔎 Search results</h1>
    <p class="lead">Query: <span class="mono">${escapeHtml(q)}</span></p>

    <div class="two-col" style="margin-top:14px;">
      <div class="panel">
        <div class="badge">Sheets</div>
        <div class="hr"></div>
        <div id="sheetResults" class="list">
          ${sheetHits.length ? sheetHits.map(h => `
            <div class="item" data-open="${escapeHtml(h.id)}">
              <div style="font-weight:800">${escapeHtml(h.title)}</div>
              ${(h.sample||[]).map(s => `
                <div class="p" style="margin-top:8px;">
                  <span class="fi">${escapeHtml(s.fi||"")}</span>
                  <span class="bn">${escapeHtml(s.bn||"")}</span>
                </div>
              `).join("")}
              <div class="row-gap" style="margin-top:10px;"><span class="chip">Open chapter</span></div>
            </div>
          `).join("") : `<p class="lead">No sheet matches.</p>`}
        </div>
      </div>

      <div class="panel">
        <div class="badge">Questions (top 20)</div>
        <div class="hr"></div>
        <div class="list">
          ${qHits.length ? qHits.map(qu => `
            <div class="item">
              <div style="font-weight:800">${escapeHtml
