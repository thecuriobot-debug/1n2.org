import { getArcadeSnapshot } from "./arcade-shell.js";

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function render(snapshot) {
  const totals = document.getElementById("totals");
  const list = document.getElementById("ladder-list");

  if (totals) {
    totals.innerHTML = `
      <div class="hub-stat-card"><span>Total Plays</span><strong>${fmt(snapshot.totalPlays)}</strong></div>
      <div class="hub-stat-card"><span>Total Score Banked</span><strong>${fmt(snapshot.totalScore)}</strong></div>
      <div class="hub-stat-card"><span>Combined Best Sum</span><strong>${fmt(snapshot.totalBest)}</strong></div>
    `;
  }

  if (!list) return;

  const ordered = Object.values(snapshot.games)
    .sort((a, b) => {
      if (b.best !== a.best) return b.best - a.best;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.plays - a.plays;
    })
    .slice(0, 20);

  list.innerHTML = ordered
    .map((g, i) => {
      const rank = i + 1;
      return `
        <article class="game-card ladder-row">
          <div>
            <span class="tag">#${rank}</span>
            <h4>${g.label}</h4>
            <p>Best ${fmt(g.best)} • ${fmt(g.plays)} plays • Total ${fmt(g.totalScore)}</p>
          </div>
          <div class="actions">
            <a class="btn" href="${g.path}">Play</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function bindActions() {
  const clearBtn = document.getElementById("clear-stats");
  if (!clearBtn) return;

  clearBtn.addEventListener("click", () => {
    const ok = window.confirm("Clear all local arcade stats for this browser?");
    if (!ok) return;
    localStorage.removeItem("mb_arcade_meta_v1");
    window.location.reload();
  });
}

function main() {
  render(getArcadeSnapshot());
  bindActions();
}

main();
