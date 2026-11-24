const processes = [];

const form = document.getElementById("processForm");
const processTable = document.getElementById("processTable");
const message = document.getElementById("message");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function renderProcessList() {
  if (processes.length === 0) {
    processTable.innerHTML =
      '<tr><td colspan="4" class="empty">No processes added yet.</td></tr>';
    return;
  }
  processTable.innerHTML = processes.map(p => `
    <tr>
      <td>${escapeHTML(p.pid)}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.priority}</td>
    </tr>
  `).join("");
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const pid = document.getElementById("pid").value.trim();
  const arrival = Number(document.getElementById("arrival").value);
  const burst = Number(document.getElementById("burst").value);
  const priority = Number(document.getElementById("priority").value);

  if (!pid || !Number.isInteger(arrival) || arrival < 0 ||
      !Number.isInteger(burst) || burst < 1 ||
      !Number.isInteger(priority) || priority < 1) {
    message.textContent = "Enter a valid ID and whole-number values (arrival ≥ 0, burst ≥ 1, priority ≥ 1).";
    return;
  }

  if (processes.some(p => p.pid.toLowerCase() === pid.toLowerCase())) {
    message.textContent = "Process ID must be unique.";
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

function renderResult(targetId, result) {
  const target = document.getElementById(targetId);

  const blocks = result.timeline.map(item => `
    <div class="gantt-item ${item.pid === "Idle" ? "idle" : ""}"
         style="flex: ${item.end - item.start}">
      ${escapeHTML(item.pid)}
    </div>
  `).join("");

  const times = result.timeline.map(item =>
    `<span>${item.start}</span>`
  ).join("") + `<span>${result.timeline[result.timeline.length - 1].end}</span>`;

  const rows = result.jobs.map(p => `
    <tr>
      <td>${escapeHTML(p.pid)}</td>
      <td>${p.completion}</td>
      <td>${p.waiting}</td>
      <td>${p.turnaround}</td>
    </tr>
  `).join("");

  target.innerHTML = `
    <h3>Gantt Chart</h3>
    <div class="gantt">${blocks}</div>
    <div class="time-labels">${times}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Process</th><th>Completion</th><th>Waiting</th><th>Turnaround</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="metrics">
      <div class="metric">Average Waiting: <strong>${result.averageWaiting.toFixed(2)}</strong></div>
      <div class="metric">Average Turnaround: <strong>${result.averageTurnaround.toFixed(2)}</strong></div>
    </div>
  `;
}

document.getElementById("runBtn").addEventListener("click", () => {
  if (processes.length === 0) {
    message.textContent = "Please add at least one process first.";
    return;
  }

  const interval = Number(document.getElementById("agingInterval").value);
  if (!Number.isInteger(interval) || interval < 1) {
    message.textContent = "Aging interval must be a whole number greater than zero.";
    return;
  }

  const without = simulate(processes, false, interval);
  const withAge = simulate(processes, true, interval);

  renderResult("withoutAging", without);
  renderResult("withAging", withAge);

  document.getElementById("comparison").innerHTML = `
    <table>
      <thead>
        <tr><th>Metric</th><th>Without Aging</th><th>With Aging</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Average Waiting Time</td>
          <td>${without.averageWaiting.toFixed(2)}</td>
          <td>${withAge.averageWaiting.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Average Turnaround Time</td>
          <td>${without.averageTurnaround.toFixed(2)}</td>
          <td>${withAge.averageTurnaround.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    <p class="hint">Aging helps prevent long-term starvation, but it does not guarantee lower averages for every input set.</p>
  `;

  document.getElementById("results").classList.remove("hidden");
  message.textContent = "";
});

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
  message.textContent = "Sample processes loaded.";
});

document.getElementById("clearBtn").addEventListener("click", () => {
  processes.length = 0;
  renderProcessList();
  document.getElementById("results").classList.add("hidden");
  message.textContent = "All processes cleared.";
});

renderProcessList();