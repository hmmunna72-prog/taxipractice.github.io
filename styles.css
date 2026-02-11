const pageEl = document.getElementById("page");

let sheets = [];
let questions = [];

/* ---------------- LOAD DATA ---------------- */

async function loadSheets(){
  const res = await fetch("./data/sheets.json");
  sheets = await res.json();
}

async function loadQuestions(){
  const res = await fetch("./data/questions.json");
  const data = await res.json();
  questions = data.questions || [];
}

/* ---------------- HOME ---------------- */

function renderHome(){
  pageEl.innerHTML = `
    <h1>Welcome 👋</h1>
    <p>Study sheets, practice questions & real exam.</p>
  `;
}

/* ---------------- STUDY ---------------- */

let sheetIndex = 0;
let zoom = 1;

function renderStudy(){

  if(!sheets.length){
    pageEl.innerHTML = `<h2>No sheets found</h2>`;
    return;
  }

  const s = sheets[sheetIndex];

  pageEl.innerHTML = `
    <h1>📘 Study Sheets</h1>

    <div class="controls">
      <button onclick="prevSheet()">⬅ Prev</button>
      <button onclick="nextSheet()">Next ➡</button>
      <button onclick="zoomIn()">+</button>
      <button onclick="zoomOut()">−</button>
    </div>

    <div class="viewer">
      <img id="sheetImg" src="${s.image}">
    </div>
  `;
}

function nextSheet(){
  sheetIndex = (sheetIndex+1) % sheets.length;
  renderStudy();
}

function prevSheet(){
  sheetIndex = (sheetIndex-1+sheets.length)%sheets.length;
  renderStudy();
}

function zoomIn(){
  zoom += .1;
  document.getElementById("sheetImg").style.transform=`scale(${zoom})`;
}

function zoomOut(){
  zoom -= .1;
  document.getElementById("sheetImg").style.transform=`scale(${zoom})`;
}

/* ---------------- PRACTICE ---------------- */

let qIndex = 0;

function renderPractice(){

  if(!questions.length){
    pageEl.innerHTML=`<h2>No questions</h2>`;
    return;
  }

  const q = questions[qIndex];

  const opts = q.options.map(o=>`
    <label>
      <input type="radio" name="opt" value="${o.id}">
      ${o.fi}
    </label><br>
  `).join("");

  pageEl.innerHTML=`
    <h1>📝 Practice Questions</h1>

    <p>${q.question_fi}</p>

    ${opts}

    <button onclick="nextQ()">Next</button>
  `;
}

function nextQ(){
  qIndex=(qIndex+1)%questions.length;
  renderPractice();
}

/* ---------------- EXAM ---------------- */

function renderExam(){
  pageEl.innerHTML=`
    <h1>⏱️ Real Time Exam</h1>
    <p>50 Questions / 50 Minutes</p>
  `;
}

/* ---------------- ROUTER ---------------- */

function router(){

  const hash = location.hash || "#/home";

  if(hash==="#/home") renderHome();
  else if(hash==="#/study") renderStudy();
  else if(hash==="#/practice") renderPractice();
  else if(hash==="#/exam") renderExam();
}

window.addEventListener("hashchange",router);

/* ---------------- INIT ---------------- */

(async function init(){
  await loadSheets();
  await loadQuestions();
  router();
})();

