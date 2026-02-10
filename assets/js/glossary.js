const list = document.getElementById("list");
const search = document.getElementById("search");
let words = [];

function render(){
  const q = (search.value || "").toLowerCase().trim();
  const filtered = words.filter(w => {
    const all = `${w.fi} ${w.en||""} ${w.bn||""}`.toLowerCase();
    return !q || all.includes(q);
  });

  list.innerHTML = filtered.map(w => `
    <div class="item">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div><b>${w.fi}</b></div>
        <div class="small">${w.en || ""}</div>
      </div>
      <div class="small">বাংলা: ${w.bn || ""}</div>
    </div>
  `).join("");
}

fetch("assets/data/glossary.json")
  .then(r => r.json())
  .then(data => { words = data; render(); })
  .catch(() => {
    list.innerHTML = `<div class="item">glossary.json পাওয়া যায়নি।</div>`;
  });

search.addEventListener("input", render);
