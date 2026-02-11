const pageEl = document.getElementById("page");
const navLinksEl = document.getElementById("navLinks");

/* --------- ONLY 4 MENU ITEMS ---------- */
const NAV_ITEMS = [
  { hash:"#/home",     label:"Home",             icon:"🏠" },
  { hash:"#/study",    label:"Study Sheets",     icon:"📘" },
  { hash:"#/practice", label:"Practice Questions", icon:"📝" },
  { hash:"#/exam",     label:"Real Time Exam",   icon:"⏱️" }
];

function renderNav(currentHash){
  navLinksEl.innerHTML = NAV_ITEMS.map(it => `
    <a class="nav-link ${it.hash === currentHash ? "active" : ""}" href="${it.hash}">
      <span class="nav-icon">${it.icon}</span>
      <span>${it.label}</span>
    </a>
  `).join("");
}

/* --------- PAGES ---------- */

function renderHome(){
  pageEl.innerHTML = `
    <div class="home-hero">
      <h1 class="home-title">Welcome 👋</h1>
      <p class="home-sub">Study sheets • Practice questions • Real time exam (50Q / 50min)</p>
    </div>
  `;
}

function renderStudy(){
  pageEl.innerHTML = `
    <h1 class="h1">📘 Study Sheets</h1>
    <p class="lead">Your sheet viewer is already working. Next step: keep adding pages in data/sheets.json</p>
  `;
}

function renderPractice(){
  pageEl.innerHTML = `
    <h1 class="h1">📝 Practice Questions</h1>
    <p class="lead">Questions will show here from data/questions.json</p>
  `;
}

function renderExam(){
  pageEl.innerHTML = `
    <h1 class="h1">⏱️ Real Time Exam</h1>
    <p class="lead">50 Questions • 50 Minutes (timer system next step)</p>
  `;
}

/* --------- ROUTER ---------- */

function router(){
  const hash = location.hash || "#/home";

  renderNav(hash);

  if(hash === "#/home") renderHome();
  else if(hash === "#/study") renderStudy();
  else if(hash === "#/practice") renderPractice();
  else if(hash === "#/exam") renderExam();
  else renderHome();
}

window.addEventListener("hashchange", router);
router();
