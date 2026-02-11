const pageEl = document.getElementById("page");
const themeBtn = document.getElementById("toggleTheme");
const searchEl = document.getElementById("globalSearch");

const state = {
  sheets: null,
  questionsData: null,

  selectedChapterId: null,

  practice: {
    topic: "ALL",
    pool: [],
    index: 0,
    selected: null,
    submitted: false,
    show: 10
  },

  exam: {
    running: false,
    pool: [],
    index: 0,
    answers: {}, // {qId: "a"}
    secondsLeft: 50 * 60,
    timerId: null
  }
};

const LS = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

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

function setActiveNav(route) {
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function escapeHtml(s="") {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadData() {
  if (state.sheets && state.questionsData) return;

  const sheetsRes = await fetch("./data/sheets.json");
  const questionsRes = await fetch("./data/questions.json");

  if (!sheetsRes.ok) throw new Error("sheets.json not found");
  if (!questionsRes.ok) throw new Error("questions.json not found");

  state.sheets = await sheetsRes.json();
  state.questionsData = await questionsRes.json();

  if (!state.selectedChapterId && state.sheets?.chapters?.length) {
    state.selectedChapterId = state.sheets.chapters[0].id;
  }
  resetPracticePool();
}

function getAllQuestions() {
  return state.questionsData?.questions || [];
}
function getTopics() {
  const t = state.questionsData?.topics || [];
  return t.length ? t : ["ALL"];
}

function resetPracticePool() {
  const all = getAllQuestions();
  const filtered = state.practice.topic === "ALL"
    ? all
    : all.filter(q => q.topic === state.practice.topic);

  state.practice.pool = shuffle(filtered).slice(0, Math.min(state.practice.show, filtered.length || state.practice.show));
  state.practice.index = 0;
  state.practice.selected = null;
  state.practice.submitted = false;
}

/* ---------------- HOME ---------------- */
function renderHome() {
  setActiveNav("home");
  pageEl.innerHTML = `
    <h1 class="h1">Welcome 👋</h1>
    <p class="lead">Study sheets + practice + real exam.</p>

    <div class="alert">
      <div style="font-weight:800">Quick Start</div>
      <div class="hr"></div>
      <div class="muted small">1) Add questions in <b>data/questions.json</b></div>
      <div class="muted small">2) Practice</div>
      <div class="muted small">3) Real Exam (50Q/50min)</div>
    </div>
  `;
}

/* ---------------- STUDY ---------------- */
function renderStudy() {
  setActiveNav("study");
  const chapters = state.sheets?.chapters || [];
  if (!chapters.length) {
    pageEl.innerHTML = `<h1 class="h1">📘 Study Sheets</h1><p class="lead">No chapters found.</p>`;
    return;
  }

  const selected = chapters.find(c => c.id === state.selectedChapterId) || chapters[0];

  const listHtml = chapters.map(c => `
    <div class="item ${c.id===selected.id ? "active" : ""}" data-ch="${escapeHtml(c.id)}">
      <div style="font-weight:800">${escapeHtml(c.title)}</div>
      <div class="small muted">${escapeHtml(c.id)} • ${(c.items?.length||0)} lines</div>
    </div>
  `).join("");

  const contentHtml = (selected.items || []).map(it => `
    <div style="margin:12px 0; line-height:1.7;">
      <div style="font-weight:700">${escapeHtml(it.fi || "")}</div>
      <div class="muted">${escapeHtml(it.bn || "")}</div>
    </div>
  `).join("");

  pageEl.innerHTML = `
    <h1 class="h1">📘 Study Sheets</h1>
    <p class="lead">Select a chapter.</p>

    <div class="two-col" style="margin-top:14px;">
      <div class="panel">
        <div class="badge">Chapters</div>
        <div class="hr"></div>
        <div id="chapterList" class="list">${listHtml}</div>
      </div>

      <div class="panel">
        <div class="badge">Reading</div>
        <h2 style="margin:10px 0 0;">${escapeHtml(selected.title)}</h2>
        <div class="hr"></div>
        ${contentHtml || `<p class="lead">No content.</p>`}
      </div>
    </div>
  `;

  document.getElementById("chapterList").addEventListener("click", (e) => {
    const it = e.target.closest(".item");
    if (!it) return;
    state.selectedChapterId = it.getAttribute("data-ch");
    renderStudy();
  });
}

/* ---------------- PRACTICE ---------------- */
function renderPractice() {
  setActiveNav("practice");
  const all = getAllQuestions();
  if (!all.length) {
    pageEl.innerHTML = `<h1 class="h1">📝 Practice</h1><p class="lead">No questions found.</p>`;
    return;
  }
  if (!state.practice.pool.length) resetPracticePool();
  const q = state.practice.pool[state.practice.index];

  const topics = ["ALL", ...getTopics().filter(t => t !== "ALL")];

  const optsHtml = (q.options || []).map(opt => {
    const checked = state.practice.selected === opt.id ? "checked" : "";
    let cls = "option";
    if (state.practice.submitted && q.answer) {
      if (opt.id === q.answer) cls += " correct";
      else if (opt.id === state.practice.selected) cls += " wrong";
    }
    return `
      <label class="${cls}">
        <input type="radio" name="opt" value="${escapeHtml(opt.id)}" ${checked} ${state.practice.submitted ? "disabled" : ""}/>
        <div>
          <div style="font-weight:700">${escapeHtml(opt.fi || "")}</div>
          <div class="muted small">${escapeHtml(opt.bn || "")}</div>
        </div>
      </label>
    `;
  }).join("");

  pageEl.innerHTML = `
    <h1 class="h1">📝 Practice Questions</h1>
    <p class="lead">Submit to see result.</p>

    <div class="controls">
      <div class="row-gap">
        <span class="small muted">Topic</span>
        <select id="topicSel" class="select">
          ${topics.map(t => `<option value="${escapeHtml(t)}" ${t===state.practice.topic ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
        </select>

        <span class="small muted">Set</span>
        <select id="sizeSel" class="select">
          ${[10,20,30,50].map(n => `<option value="${n}" ${n===state.practice.show ? "selected" : ""}>${n} questions</option>`).join("")}
        </select>

        <button id="newSet" class="btn" type="button">🔁 New set</button>
      </div>

      <div class="row-gap">
        <span class="badge">Q: ${state.practice.index+1}/${state.practice.pool.length}</span>
        <span class="badge">${escapeHtml(q.topic || "Topic")}</span>
      </div>
    </div>

    <div class="qbox">
      <div class="small muted">${escapeHtml(q.id || "")}</div>
      <div style="margin-top:10px; line-height:1.7;">
        <div style="font-weight:800">${escapeHtml(q.question_fi || "")}</div>
        <div class="muted">${escapeHtml(q.question_bn || "")}</div>
      </div>

      <div id="opts">${optsHtml}</div>

      <div class="row-gap" style="margin-top:14px; justify-content:space-between;">
        <div class="row-gap">
          <button id="submitBtn" class="btn primary" type="button" ${state.practice.submitted ? "disabled" : ""}>Submit</button>
          <button id="nextBtn" class="btn" type="button" ${state.practice.submitted ? "" : "disabled"}>Next ▶</button>
        </div>
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
    resetPracticePool();
    renderPractice();
  });

  document.getElementById("sizeSel").addEventListener("change", (e) => {
    state.practice.show = Number(e.target.value);
    resetPracticePool();
    renderPractice();
  });

  document.getElementById("newSet").addEventListener("click", () => {
    resetPracticePool();
    renderPractice();
  });

  document.getElementById("submitBtn").addEventListener("click", () => {
    if (!state.practice.selected) {
      document.getElementById("feedback").innerHTML = `<div class="alert">⚠️ Select an option first.</div>`;
      return;
    }

    if (!q.answer) {
      state.practice.submitted = true;
      document.getElementById("feedback").innerHTML = `
        <div class="alert">
          <div style="font-weight:800">ℹ️ Answer not set yet</div>
          <div class="hr"></div>
          <div class="muted small">This question is added, but the correct answer is not set yet.</div>
        </div>
      `;
      renderPractice();
      return;
    }

    state.practice.submitted = true;
    const correct = state.practice.selected === q.answer;

    document.getElementById("feedback").innerHTML = `
      <div class="alert">
        <div style="font-weight:800">${correct ? "✅ Correct" : "❌ Wrong"}</div>
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

/* ---------------- REAL EXAM ---------------- */
function formatTime(sec){
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function stopExamTimer(){
  if(state.exam.timerId){
    clearInterval(state.exam.timerId);
    state.exam.timerId = null;
  }
}

function startExam(){
  const all = getAllQuestions();
  if(all.length < 1){
    alert("No questions found.");
    return;
  }
  state.exam.running = true;
  state.exam.pool = shuffle(all).slice(0, Math.min(50, all.length));
  state.exam.index = 0;
  state.exam.answers = {};
  state.exam.secondsLeft = 50 * 60;

  stopExamTimer();
  state.exam.timerId = setInterval(() => {
    state.exam.secondsLeft--;
    if(state.exam.secondsLeft <= 0){
      state.exam.secondsLeft = 0;
      stopExamTimer();
      finishExam();
      return;
    }
    const t = document.getElementById("examTimer");
    if(t) t.textContent = formatTime(state.exam.secondsLeft);
  }, 1000);

  renderExam();
}

function finishExam(){
  stopExamTimer();
  state.exam.running = false;

  const pool = state.exam.pool;
  let attempted = 0;
  let correct = 0;

  for(const q of pool){
    const a = state.exam.answers[q.id];
    if(a){
      attempted++;
      if(q.answer && a === q.answer) correct++;
    }
  }

  pageEl.innerHTML = `
    <h1 class="h1">✅ Exam Finished</h1>
    <div class="alert">
      <div><b>Total:</b> ${pool.length}</div>
      <div><b>Attempted:</b> ${attempted}</div>
      <div><b>Correct:</b> ${correct} ${attempted ? `(${Math.round((correct/attempted)*100)}%)` : ""}</div>
      <div class="hr"></div>
      <div class="muted small">Note: Questions with no correct answer set (answer=null) cannot be counted as correct.</div>
    </div>
    <div class="row-gap" style="margin-top:12px;">
      <button class="btn primary" id="backHome">Back Home</button>
      <button class="btn" id="startAgain">Start Again</button>
    </div>
  `;

  document.getElementById("backHome").onclick = () => location.hash = "#/home";
  document.getElementById("startAgain").onclick = () => startExam();
}

function renderExam(){
  setActiveNav("exam");

  const pool = state.exam.pool;
  if(!state.exam.running){
    pageEl.innerHTML = `
      <h1 class="h1">⏱️ Real Exam</h1>
      <p class="lead">50 Questions • 50 Minutes • 1 question per page</p>
      <div class="alert">
        <div class="muted small">Tip: Add more questions in <b>data/questions.json</b> for better exam.</div>
      </div>
      <div class="row-gap" style="margin-top:12px;">
        <button class="btn primary" id="startExamBtn">Start Exam</button>
      </div>
    `;
    document.getElementById("startExamBtn").onclick = startExam;
    return;
  }

  const q = pool[state.exam.index];
  const chosen = state.exam.answers[q.id] || "";

  const optsHtml = (q.options || []).map(opt => {
    const checked = chosen === opt.id ? "checked" : "";
    return `
      <label class="option">
        <input type="radio" name="exopt" value="${escapeHtml(opt.id)}" ${checked}/>
        <div>
          <div style="font-weight:700">${escapeHtml(opt.fi || "")}</div>
          <div class="muted small">${escapeHtml(opt.bn || "")}</div>
        </div>
      </label>
    `;
  }).join("");

  pageEl.innerHTML = `
    <div class="row-gap" style="justify-content:space-between;">
      <h1 class="h1" style="margin:0;">⏱️ Real Exam</h1>
      <div class="timer">⏳ <span id="examTimer">${formatTime(state.exam.secondsLeft)}</span></div>
    </div>
    <div class="row-gap" style="margin-top:10px;">
      <span class="badge">Q: ${state.exam.index+1}/${pool.length}</span>
      <span class="badge">${escapeHtml(q.topic || "Topic")}</span>
    </div>

    <div class="qbox">
      <div style="font-weight:800">${escapeHtml(q.question_fi || "")}</div>
      <div class="muted" style="margin-top:6px;">${escapeHtml(q.question_bn || "")}</div>

      <div id="examOpts">${optsHtml}</div>

      <div class="row-gap" style="margin-top:14px; justify-content:space-between;">
        <button class="btn" id="prevBtn" ${state.exam.index===0 ? "disabled" : ""}>◀ Prev</button>
        <div class="row-gap">
          <button class="btn" id="finishBtn">Finish</button>
          <button class="btn primary" id="nextBtn">${state.exam.index === pool.length-1 ? "Finish ▶" : "Next ▶"}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("examOpts").addEventListener("change", (e) => {
    const r = e.target.closest("input[type=radio]");
    if(!r) return;
    state.exam.answers[q.id] = r.value;
  });

  document.getElementById("prevBtn").onclick = () => {
    if(state.exam.index>0){
      state.exam.index--;
      renderExam();
    }
  };

  document.getElementById("nextBtn").onclick = () => {
    if(state.exam.index >= pool.length-1){
      finishExam();
      return;
    }
    state.exam.index++;
    renderExam();
  };

  document.getElementById("finishBtn").onclick = () => finishExam;
  document.getElementById("finishBtn").onclick = () => finishExam();
}

/* ---------------- OTHER PAGES ---------------- */
function renderProgress() {
  setActiveNav("progress");
  pageEl.innerHTML = `<h1 class="h1">📈 Progress</h1><p class="lead">Coming soon.</p>`;
}
function renderResources() {
  setActiveNav("resources");
  pageEl.innerHTML = `<h1 class="h1">🔗 Resources / FAQ</h1><p class="lead">Add links later.</p>`;
}

/* ---------------- ROUTER ---------------- */
async function router() {
  try {
    await loadData();
  } catch (e) {
    pageEl.innerHTML = `<h1 class="h1">Error</h1><p class="lead">${escapeHtml(String(e.message || e))}</p>`;
    return;
  }

  const hash = location.hash || "#/home";
  const path = hash.replace("#","");

  if (path.startsWith("/home")) return renderHome();
  if (path.startsWith("/study")) return renderStudy();
  if (path.startsWith("/practice")) return renderPractice();
  if (path.startsWith("/exam")) return renderExam();
  if (path.startsWith("/progress")) return renderProgress();
  if (path.startsWith("/resources")) return renderResources();

  location.hash = "#/home";
}

window.addEventListener("hashchange", router);

searchEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") alert("Search will be added later.");
});

router();
