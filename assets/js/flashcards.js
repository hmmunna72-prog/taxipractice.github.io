
const list = document.getElementById("list");
const search = document.getElementById("search");
let cards = [];

function render(){
  const q = (search.value || "").toLowerCase().trim();
  const filtered = cards.filter(c => (`${c.front} ${c.back}`).toLowerCase().includes(q) || !q);

  list.innerHTML = filtered.map((c, i) => `
    <div class="item" data-i="${i}" style="cursor:pointer;">
      <div><b>${c.front}</b></div>
      <div class="small" style="margin-top:8px; display:none;" id="back${i}">${c.back}</div>
    </div>
  `).join("");

  document.querySelectorAll(".item[data-i]").forEach(el=>{
    el.onclick = () => {
      const i = el.getAttribute("data-i");
      const back = document.getElementById("back"+i);
      back.style.display = (back.style.display === "none") ? "block" : "none";
    };
  });
}

fetch("assets/data/flashcards.json")
  .then(r => r.json())
  .then(data => { cards = data; render(); })
  .catch(() => {
    list.innerHTML = `<div class="item">flashcards.json পাওয়া যায়নি।</div>`;
  });

search.addEventListener("input", render);
