const page = document.getElementById("page");

let questions = [];
let index = 0;
let selected = null;

async function loadQuestions(){
  const res = await fetch("./data/questions.json");
  const data = await res.json();
  questions = data.questions;
}

function home(){
  page.innerHTML = `
    <h1>Welcome</h1>
    <p>Taxi Exam Preparation Website</p>
  `;
}

function study(){
  page.innerHTML = `
    <h1>Study Sheets</h1>
    <p>Study content will be added.</p>
  `;
}

function practice(){
  if(!questions.length){
    page.innerHTML = "No questions";
    return;
  }

  const q = questions[index];

  let opts = "";
  q.options.forEach(o=>{
    opts += `
      <div class="option">
        <input type="radio" name="opt" value="${o.id}">
        ${o.fi}
      </div>
    `;
  });

  page.innerHTML = `
    <h2>${q.question_fi}</h2>
    ${opts}
    <br>
    <button onclick="submitAns()">Submit</button>
    <div id="result"></div>
  `;
}

function submitAns(){
  const q = questions[index];
  const val = document.querySelector("input[name=opt]:checked");

  if(!val){
    alert("Select answer");
    return;
  }

  if(!q.answer){
    document.getElementById("result").innerHTML =
      "ℹ️ Answer not set yet";
    return;
  }

  if(val.value === q.answer){
    document.getElementById("result").innerHTML =
      "✅ Correct";
  }else{
    document.getElementById("result").innerHTML =
      "❌ Wrong";
  }
}

function router(){
  const hash = location.hash;

  if(hash === "#/study") study();
  else if(hash === "#/practice") practice();
  else home();
}

window.addEventListener("hashchange", router);

loadQuestions().then(router);
