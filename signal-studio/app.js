const state = {
  packs: [],
  filtered: [],
  selectedId: null,
  logs: [],
};

const stageOrder = ["ingest", "transcribe", "narrate", "storyboard", "publish"];

const els = {
  channelFilter: document.getElementById("channel-filter"),
  fromDate: document.getElementById("from-date"),
  toDate: document.getElementById("to-date"),
  filterStatus: document.getElementById("filter-status"),
  resultCount: document.getElementById("result-count"),
  packList: document.getElementById("pack-list"),
  pipelineStages: document.getElementById("pipeline-stages"),
  heroRails: document.getElementById("hero-rails"),
  trendCanvas: document.getElementById("trend-canvas"),
  generateBtn: document.getElementById("generate-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  liveBadge: document.getElementById("live-badge"),

  kpiPacks: document.getElementById("kpi-packs"),
  kpiRecords: document.getElementById("kpi-records"),
  kpiAudio: document.getElementById("kpi-audio"),
  kpiEngagement: document.getElementById("kpi-engagement"),

  detailTitle: document.getElementById("detail-title"),
  detailMeta: document.getElementById("detail-meta"),
  detailHeadline: document.getElementById("detail-headline"),
  detailTranscript: document.getElementById("detail-transcript"),
  detailVoice: document.getElementById("detail-voice"),
  detailStoryboard: document.getElementById("detail-storyboard"),
  detailArtifacts: document.getElementById("detail-artifacts"),
  automationLog: document.getElementById("automation-log"),
};

init();

async function init() {
  wireEvents();
  await loadData();
  seedDefaultDates();
  applyFilters();
  addLog("Studio boot complete. Stream synchronized.");
}

function wireEvents() {
  [els.channelFilter, els.fromDate, els.toDate].forEach((el) => {
    el.addEventListener("change", () => applyFilters());
  });

  els.generateBtn.addEventListener("click", () => {
    generateTodayPack();
  });

  els.refreshBtn.addEventListener("click", async () => {
    addLog("Reloading packs from local data source...");
    await loadData();
    applyFilters();
    addLog("Reload complete.");
  });
}

async function loadData() {
  try {
    const response = await fetch("data/packs.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    state.packs = sortByDate(json);
    if (!state.selectedId && state.packs.length) {
      state.selectedId = state.packs[0].id;
    }
    pulseLiveBadge();
  } catch (error) {
    console.error(error);
    els.filterStatus.textContent = "Could not read data/packs.json";
  }
}

function sortByDate(items) {
  return items
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function seedDefaultDates() {
  if (!state.packs.length) return;
  const latest = state.packs[0].date;
  const oldestVisible = state.packs[Math.min(state.packs.length - 1, 7)].date;
  if (!els.toDate.value) els.toDate.value = latest;
  if (!els.fromDate.value) els.fromDate.value = oldestVisible;
}

function applyFilters() {
  const channel = els.channelFilter.value;
  const from = els.fromDate.value ? new Date(`${els.fromDate.value}T00:00:00`) : null;
  const to = els.toDate.value ? new Date(`${els.toDate.value}T23:59:59`) : null;

  state.filtered = state.packs.filter((pack) => {
    if (channel !== "all" && pack.channel !== channel) return false;
    const d = new Date(`${pack.date}T12:00:00`);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  if (!state.filtered.some((p) => p.id === state.selectedId)) {
    state.selectedId = state.filtered[0]?.id || null;
  }

  render();
}

function render() {
  renderKpis();
  renderPackList();
  renderDetail();
  renderPipeline();
  renderHeroRails();
  drawTrend();
  renderLogs();

  const channelLabel =
    els.channelFilter.value === "all" ? "all channels" : els.channelFilter.value;
  els.filterStatus.textContent = `${state.filtered.length} pack(s) visible in ${channelLabel}.`;
  els.resultCount.textContent = `${state.filtered.length} result(s)`;
}

function renderKpis() {
  const totals = state.filtered.reduce(
    (acc, pack) => {
      acc.records += pack.records_ingested;
      acc.audio += pack.narration_seconds;
      acc.engagement += pack.engagement_score;
      return acc;
    },
    { records: 0, audio: 0, engagement: 0 }
  );

  const avgEng = state.filtered.length
    ? Math.round(totals.engagement / state.filtered.length)
    : 0;

  els.kpiPacks.textContent = String(state.filtered.length);
  els.kpiRecords.textContent = formatInt(totals.records);
  els.kpiAudio.textContent = `${Math.round(totals.audio / 60)}m`;
  els.kpiEngagement.textContent = String(avgEng);
}

function renderPackList() {
  if (!state.filtered.length) {
    els.packList.innerHTML = "<p class='pack-meta'>No packs in this filter window.</p>";
    return;
  }

  els.packList.innerHTML = state.filtered
    .map((pack) => {
      const selected = pack.id === state.selectedId ? "selected" : "";
      return `
      <article class="pack-item ${selected}" data-id="${pack.id}">
        <div class="pack-top">
          <h4 class="pack-title">${escapeHtml(pack.topic)}</h4>
          <span class="tag ${pack.channel.toLowerCase()}">${pack.channel}</span>
        </div>
        <p class="pack-meta">${pack.date} · ${pack.status} · urgency ${pack.urgency}</p>
        <div class="pack-stats">
          <div class="pack-stat"><b>${formatInt(pack.records_ingested)}</b>records</div>
          <div class="pack-stat"><b>${formatInt(pack.comments_analyzed)}</b>comments</div>
          <div class="pack-stat"><b>${pack.engagement_score}</b>score</div>
        </div>
      </article>`;
    })
    .join("");

  els.packList.querySelectorAll(".pack-item").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedId = node.dataset.id;
      render();
      addLog(`Opened pack ${node.dataset.id}`);
    });
  });
}

function renderDetail() {
  const pack = currentPack();
  if (!pack) {
    els.detailTitle.textContent = "Select a pack";
    els.detailMeta.textContent = "No data";
    return;
  }

  els.detailTitle.textContent = pack.topic;
  els.detailMeta.textContent = `${pack.date} · ${pack.channel} · engagement ${pack.engagement_score}`;
  els.detailHeadline.textContent = pack.outputs.headline;
  els.detailTranscript.textContent = pack.outputs.transcript;
  els.detailVoice.textContent = pack.outputs.voice_script;

  els.detailStoryboard.innerHTML = pack.outputs.storyboard
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  els.detailArtifacts.innerHTML = pack.outputs.artifacts
    .map((name) => `<div class="artifact">${escapeHtml(name)}</div>`)
    .join("");
}

function renderPipeline() {
  const pack = currentPack();
  if (!pack) {
    els.pipelineStages.innerHTML = "";
    return;
  }

  els.pipelineStages.innerHTML = stageOrder
    .map((stageName) => {
      const value = Number(pack.stages[stageName] || 0);
      return `
      <div class="stage">
        <p class="stage-label">${stageName}</p>
        <p class="stage-value">${value}%</p>
        <div class="stage-bar"><span style="width:${value}%"></span></div>
      </div>
      `;
    })
    .join("");
}

function renderHeroRails() {
  if (!state.filtered.length) {
    els.heroRails.innerHTML = "";
    return;
  }

  const metrics = [
    ["Records", average(state.filtered.map((p) => p.records_ingested)), 3800],
    ["Comments", average(state.filtered.map((p) => p.comments_analyzed)), 1500],
    ["Transcript Words", average(state.filtered.map((p) => p.transcript_words)), 2200],
    ["Narration (sec)", average(state.filtered.map((p) => p.narration_seconds)), 240],
    ["Engagement", average(state.filtered.map((p) => p.engagement_score)), 100],
  ];

  els.heroRails.innerHTML = metrics
    .map(([label, value, max]) => {
      const pct = Math.min(100, Math.round((value / max) * 100));
      const view = label === "Engagement" ? Math.round(value) : Math.round(value);
      return `
      <div class="rail-row">
        <div class="rail-name">${label}</div>
        <div class="rail-track"><div class="rail-fill" style="width:${pct}%"></div></div>
        <div class="rail-value">${view}</div>
      </div>
      `;
    })
    .join("");
}

function drawTrend() {
  const canvas = els.trendCanvas;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const packs = state.filtered.slice(0, 7).reverse();
  if (!packs.length) return;

  const pad = { l: 56, r: 30, t: 22, b: 44 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;

  const maxRecords = Math.max(...packs.map((p) => p.records_ingested), 1);
  const maxEng = Math.max(...packs.map((p) => p.engagement_score), 1);

  ctx.strokeStyle = "rgba(31, 36, 53, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }

  const points = packs.map((pack, i) => {
    const x = pad.l + (chartW * i) / Math.max(1, packs.length - 1);
    const yr = pad.t + chartH - (pack.records_ingested / maxRecords) * chartH;
    const ye = pad.t + chartH - (pack.engagement_score / maxEng) * chartH;
    return { x, yr, ye, pack };
  });

  drawLine(ctx, points, "yr", "#0db6b6", 3.2, true);
  drawLine(ctx, points, "ye", "#ff5e57", 2.5, false);

  ctx.fillStyle = "#1f2435";
  ctx.font = "700 20px Space Mono";
  ctx.fillText("records", pad.l, 18);
  ctx.fillStyle = "#7a7f95";
  ctx.font = "700 18px Space Mono";
  ctx.fillText("vs", pad.l + 110, 18);
  ctx.fillStyle = "#ff5e57";
  ctx.fillText("engagement", pad.l + 150, 18);

  ctx.fillStyle = "#4b5268";
  ctx.font = "13px Space Mono";
  points.forEach((pt) => {
    ctx.fillText(pt.pack.date.slice(5), pt.x - 18, h - 16);
  });
}

function drawLine(ctx, points, key, color, width, fillArea) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt[key]);
    else ctx.lineTo(pt.x, pt[key]);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();

  if (fillArea) {
    const bottom = 320 - 44;
    const first = points[0];
    const last = points[points.length - 1];
    ctx.lineTo(last.x, bottom);
    ctx.lineTo(first.x, bottom);
    ctx.closePath();
    ctx.fillStyle = "rgba(13, 182, 182, 0.14)";
    ctx.fill();
  }

  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt[key], key === "yr" ? 4 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function generateTodayPack() {
  const today = new Date().toISOString().slice(0, 10);
  const base = state.packs[0] || fallbackPack();
  const channelChoices = ["Crypto", "Curio", "News", "YouTube"];
  const channel = channelChoices[Math.floor(Math.random() * channelChoices.length)];

  const next = {
    ...base,
    id: `pack-${today}-${Math.random().toString(36).slice(2, 6)}`,
    date: today,
    channel,
    topic: `${channel} Auto Pack · ${today}`,
    urgency: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
    records_ingested: jitter(base.records_ingested, 0.14),
    comments_analyzed: jitter(base.comments_analyzed, 0.2),
    transcript_words: jitter(base.transcript_words, 0.16),
    narration_seconds: jitter(base.narration_seconds, 0.11),
    video_seconds: jitter(base.video_seconds, 0.12),
    report_pages: Math.max(6, Math.round(jitter(base.report_pages, 0.2))),
    engagement_score: clamp(Math.round(jitter(base.engagement_score, 0.09)), 55, 96),
    stages: {
      ingest: 100,
      transcribe: 100,
      narrate: 100,
      storyboard: 100,
      publish: 100,
    },
    outputs: {
      headline: `${channel} signal pack generated and staged for publish.`,
      transcript:
        "Automated pass completed with refreshed source weighting, anomaly checks, and audience-sensitive framing.",
      voice_script:
        "Today we have a clean pipeline run with high confidence in source quality and stable engagement signals.",
      storyboard: [
        "Open with top three market movers",
        "Show source confidence ladder",
        "Highlight audience sentiment swing",
        "Close with next 24-hour tactical plan",
      ],
      artifacts: [
        `briefing-${today}.pdf`,
        `narration-${today}.mp3`,
        `clip-${today}.mp4`,
        `social-card-${today}.png`,
      ],
    },
  };

  state.packs = sortByDate([next, ...state.packs]);
  state.selectedId = next.id;
  if (els.toDate.value < today) {
    els.toDate.value = today;
  }
  applyFilters();

  addLog(`Generated ${next.id} (${next.channel})`);
  pulseLiveBadge("NEW PACK BUILT");
}

function fallbackPack() {
  return {
    id: "fallback",
    date: new Date().toISOString().slice(0, 10),
    channel: "Crypto",
    topic: "Fallback pack",
    urgency: "medium",
    status: "published",
    records_ingested: 1800,
    comments_analyzed: 400,
    transcript_words: 1400,
    narration_seconds: 150,
    video_seconds: 80,
    report_pages: 9,
    engagement_score: 70,
    stages: { ingest: 100, transcribe: 100, narrate: 100, storyboard: 100, publish: 100 },
    outputs: {
      headline: "Fallback generated.",
      transcript: "-",
      voice_script: "-",
      storyboard: ["-"],
      artifacts: ["-"],
    },
  };
}

function currentPack() {
  return state.filtered.find((pack) => pack.id === state.selectedId) || state.filtered[0] || null;
}

function renderLogs() {
  els.automationLog.innerHTML = state.logs
    .slice(0, 10)
    .map(
      (item) => `
      <div class="log-row">
        <p class="log-time">${item.time}</p>
        <p class="log-msg">${escapeHtml(item.msg)}</p>
      </div>`
    )
    .join("");
}

function addLog(msg) {
  state.logs.unshift({
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    msg,
  });
  renderLogs();
}

function pulseLiveBadge(text) {
  if (!els.liveBadge) return;
  if (text) els.liveBadge.textContent = text;
  els.liveBadge.animate(
    [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.06)", opacity: 0.95 },
      { transform: "scale(1)", opacity: 1 },
    ],
    { duration: 460, easing: "ease-out" }
  );
  if (text) {
    setTimeout(() => {
      els.liveBadge.textContent = "DATA STREAM LIVE";
    }, 1400);
  }
}

function formatInt(n) {
  return Number(n || 0).toLocaleString();
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((acc, n) => acc + Number(n || 0), 0) / nums.length;
}

function jitter(base, pct) {
  const mag = base * pct;
  return Math.max(1, Math.round(base + (Math.random() * 2 - 1) * mag));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
