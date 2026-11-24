const processes = [];

const form = document.getElementById("processForm");
const processTable = document.getElementById("processTable");
const processCount = document.getElementById("processCount");
const message = document.getElementById("message");
const agingInput = document.getElementById("agingInterval");
const agingOutput = document.getElementById("agingOutput");

/* ============ Helpers ============ */
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function priorityClass(p) {
  if (p <= 2) return "prio-high";
  if (p <= 5) return "prio-mid";
  return "prio-low";
}

/* ============ Render Queue ============ */
function renderProcessList() {
  processCount.textContent = processes.length;

  if (processes.length === 0) {
    processTable.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No processes yet.</p>
        <p class="empty-sub">Add one on the left, or click <strong>Load sample data</strong>.</p>
      </div>`;
    return;
  }

  processTable.innerHTML = processes.map((p, i) => `
    <div class="proc-item">
      <span class="proc-name">${escapeHTML(p.pid)}</span>
      <div class="proc-meta">
        <strong>Arrives at ${p.arrival} · runs for ${p.burst}</strong>
        <span>Total ${p.burst} time unit${p.burst === 1 ? "" : "s"}</span>
      </div>
      <span class="prio-tag ${priorityClass(p.priority)}" title="Priority">P${p.priority}</span>
      <button class="proc-delete" data-index="${i}" title="Remove">×</button>
    </div>
  `).join("");

  processTable.querySelectorAll(".proc-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      processes.splice(Number(btn.dataset.index), 1);
      renderProcessList();
    });
  });
}

/* ============ Add ============ */
form.addEventListener("submit", event => {
  event.preventDefault();

  const pid = document.getElementById("pid").value.trim();
  const arrival = Number(document.getElementById("arrival").value);
  const burst = Number(document.getElementById("burst").value);
  const priority = Number(document.getElementById("priority").value);

  if (!pid || !Number.isInteger(arrival) || arrival < 0 ||
      !Number.isInteger(burst) || burst < 1 ||
      !Number.isInteger(priority) || priority < 1) {
    message.textContent = "Please fill every field with valid whole numbers.";
    return;
  }
  if (processes.some(p => p.pid.toLowerCase() === pid.toLowerCase())) {
    message.textContent = "That process ID is already in the queue.";
    return;
  }

  processes.push({ pid, arrival, burst, priority });
  renderProcessList();

  form.reset();
  document.getElementById("arrival").value = 0;
  document.getElementById("burst").value = 3;
  document.getElementById("priority").value = 2;
  message.textContent = "";
});

/* ============ Slider ============ */
agingInput.addEventListener("input", () => {
  agingOutput.textContent = agingInput.value;
});

/* ============ Result Rendering ============ */
function renderResult(targetId, result) {
  const target = document.getElementById(targetId);

  const blocks = result.timeline.map(item => {
    const idx = result.jobs.findIndex(j => j.pid === item.pid);
    const cls = item.pid === "Idle" ? "idle" : `pid-${idx % 7}`;
    return `<div class="gantt-item ${cls}" style="flex: ${item.end - item.start}">
      ${escapeHTML(item.pid)}
    </div>`;
  }).join("");

  const lastEnd = result.timeline[result.timeline.length - 1].end;
  const times = result.timeline.map(item => `<span>${item.start}</span>`).join("")
              + `<span>${lastEnd}</span>`;

  const rows = result.jobs.map(p => `
    <tr>
      <td>${escapeHTML(p.pid)}</td>
      <td>${p.completion}</td>
      <td>${p.waiting}</td>
      <td>${p.turnaround}</td>
    </tr>
  `).join("");

  target.innerHTML = `
    <div class="gantt">${blocks}</div>
    <div class="time-labels">${times}</div>
    <div class="gantt-metrics">
      <div class="metric-chip">Avg wait <strong>${result.averageWaiting.toFixed(2)}</strong></div>
      <div class="metric-chip">Avg turnaround <strong>${result.averageTurnaround.toFixed(2)}</strong></div>
    </div>
    <table class="mini-table">
      <thead>
        <tr><th>Process</th><th>Completion</th><th>Waiting</th><th>Turnaround</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* ============ Scoreboard ============ */
function renderScoreboard(without, withAge) {
  const baselineBetter = without.averageWaiting <= withAge.averageWaiting;
  const winnerClass = "score-winner";

  const card = (label, res, isWinner, note) => `
    <div class="score-card ${isWinner ? winnerClass : ""}">
      <div class="score-label">${label}</div>
      <div class="score-main">
        <span class="score-value">${res.averageWaiting.toFixed(2)}</span>
        <span class="score-unit">avg wait</span>
      </div>
      <div class="score-note">${note}</div>
      ${isWinner ? `<span class="score-winner-pill">🏆 Better avg wait</span>` : ""}
    </div>
  `;

  document.getElementById("scoreboard").innerHTML =
    card("Without aging", without, baselineBetter, "Classic priority — fast but can starve low-priority processes.") +
    card("With aging ✨", withAge, !baselineBetter, "Fair — low-priority processes gradually climb up.");
}

/* ============ Detailed Comparison ============ */
function renderComparison(without, withAge) {
  const wr = without.averageWaiting;
  const wa = withAge.averageWaiting;
  const tr = without.averageTurnaround;
  const ta = withAge.averageTurnaround;

  function deltaClass(base, age) {
    if (Math.abs(base - age) < 0.001) return "same";
    return age < base ? "good" : "bad";
  }
  function deltaLabel(base, age) {
    const diff = age - base;
    if (Math.abs(diff) < 0.001) return "same";
    const sign = diff < 0 ? "↓" : "↑";
    return `${sign} ${Math.abs(diff).toFixed(2)}`;
  }

  const waitingBetter = wa < wr;
  const insight = waitingBetter
    ? "Aging <strong>reduced</strong> average waiting time in this workload — priority escalation is doing its job."
    : (Math.abs(wa - wr) < 0.001
      ? "Aging had <strong>no measurable effect</strong> here — this workload was already starvation-free."
      : "Aging slightly <strong>increased</strong> average waiting here — but it prevented long-term starvation for low-priority processes, which is its purpose.");

  document.getElementById("comparison").innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Without aging</th>
          <th>With aging</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="metric-name">Average waiting time</td>
          <td class="val-base">${wr.toFixed(2)}</td>
          <td class="val-aging">${wa.toFixed(2)}</td>
          <td><span class="val-delta ${deltaClass(wr, wa)}">${deltaLabel(wr, wa)}</span></td>
        </tr>
        <tr>
          <td class="metric-name">Average turnaround time</td>
          <td class="val-base">${tr.toFixed(2)}</td>
          <td class="val-aging">${ta.toFixed(2)}</td>
          <td><span class="val-delta ${deltaClass(tr, ta)}">${deltaLabel(tr, ta)}</span></td>
        </tr>
      </tbody>
    </table>
    <div class="insight-box">💡 ${insight}</div>
  `;
}

/* ============ Run ============ */
document.getElementById("runBtn").addEventListener("click", () => {
  if (processes.length === 0) {
    message.textContent = "Add at least one process before running.";
    return;
  }

  const interval = Number(agingInput.value);
  if (!Number.isInteger(interval) || interval < 1) {
    message.textContent = "Aging interval must be at least 1.";
    return;
  }

  const without = simulate(processes, false, interval);
  const withAge = simulate(processes, true, interval);

  renderResult("withoutAging", without);
  renderResult("withAging", withAge);
  renderScoreboard(without, withAge);
  renderComparison(without, withAge);

  document.getElementById("results").classList.remove("hidden");
  message.textContent = "";

  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ============ Sample / Clear ============ */
document.getElementById("sampleBtn").addEventListener("click", () => {
  processes.splice(0, processes.length,
    { pid: "P1", arrival: 0, burst: 3, priority: 5 },
    { pid: "P2", arrival: 1, burst: 2, priority: 1 },
    { pid: "P3", arrival: 2, burst: 2, priority: 1 },
    { pid: "P4", arrival: 3, burst: 2, priority: 1 },
    { pid: "P5", arrival: 4, burst: 2, priority: 1 },
    { pid: "P6", arrival: 5, burst: 2, priority: 1 },
    { pid: "P7", arrival: 6, burst: 2, priority: 1 }
  );
  renderProcessList();
  document.getElementById("results").classList.add("hidden");
  message.textContent = "Sample workload loaded — try running it!";
});

document.getElementById("clearBtn").addEventListener("click", () => {
  processes.length = 0;
  renderProcessList();
  document.getElementById("results").classList.add("hidden");
  message.textContent = "";
});

/* ============ Theme ============ */
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

/* ============ Step nav ============ */
document.querySelectorAll(".step-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    const target = document.getElementById(pill.dataset.target);
    if (!target) return;
    document.querySelectorAll(".step-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

/* ============ Init ============ */
renderProcessList();