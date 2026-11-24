const processes = [];
const $ = id => document.getElementById(id);
const form = $("processForm"), processTable = $("processTable"), message = $("message");
let lastResults = null;
 
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function updateStats() {
  $("totalCount").textContent = processes.length;
  $("totalBurst").textContent = processes.reduce((s,p)=>s+p.burst,0);
  $("highestPriority").textContent = processes.length ? Math.min(...processes.map(p=>p.priority)) : "—";
  $("intervalStat").textContent = $("agingInterval").value || "—";
  $("listCount").textContent = processes.length;
}
function renderProcessList() {
  const query = $("searchInput").value.trim().toLowerCase();
  const visible = processes.filter(p=>p.pid.toLowerCase().includes(query));
  if (!visible.length) {
    processTable.innerHTML = `<tr><td colspan="6" class="empty">${processes.length ? "No matching processes." : "No processes yet. Add a process or load sample data."}</td></tr>`;
  } else {
    processTable.innerHTML = visible.map(p=>`<tr>
      <td><span class="pid-chip">${escapeHTML(p.pid)}</span></td><td>${p.arrival}</td><td>${p.burst}</td>
      <td><span class="priority-chip">${p.priority}</span></td><td>${p.arrival+p.burst}</td>
      <td><button class="delete-btn" data-delete="${escapeHTML(p.pid)}" type="button">Remove</button></td></tr>`).join("");
  }
  updateStats();
}
function resetResults() { lastResults=null; $("results").classList.add("hidden"); }
form.addEventListener("submit", event=>{
  event.preventDefault();
  const pid=$("pid").value.trim(), arrival=Number($("arrival").value), burst=Number($("burst").value), priority=Number($("priority").value);
  if (!pid || !Number.isSafeInteger(arrival) || arrival<0 || !Number.isSafeInteger(burst) || burst<1 || !Number.isSafeInteger(priority) || priority<1) {
    message.textContent="Please enter a process ID and valid whole-number values."; return;
  }
  if (processes.some(p=>p.pid.toLowerCase()===pid.toLowerCase())) { message.textContent="Process ID already exists. Use a unique ID."; return; }
  processes.push({pid,arrival,burst,priority}); renderProcessList(); resetResults();
  form.reset(); $("arrival").value=0; $("burst").value=3; $("priority").value=2; message.textContent=`${pid} added successfully.`;
});
processTable.addEventListener("click", event=>{
  const btn=event.target.closest("[data-delete]"); if(!btn)return;
  const index=processes.findIndex(p=>p.pid===btn.dataset.delete);
  if(index>=0){processes.splice(index,1);renderProcessList();resetResults();message.textContent="Process removed.";}
});
$("searchInput").addEventListener("input",renderProcessList);
$("agingInterval").addEventListener("input",updateStats);
 
function renderResult(targetId,result,aged) {
  const target=$(targetId);
  const blocks=result.timeline.map(item=>`<div class="gantt-item ${item.pid==="Idle"?"idle":aged?"aged":""}" style="--grow:${item.end-item.start}" title="${escapeHTML(item.pid)}: ${item.start}–${item.end}">${escapeHTML(item.pid)}</div>`).join("");
  const times=result.timeline.map(item=>`<span>${item.start}</span>`).join("")+`<span>${result.timeline.at(-1).end}</span>`;
  const rows=result.jobs.map(p=>`<tr><td>${escapeHTML(p.pid)}</td><td>${p.completion}</td><td>${p.waiting}</td><td>${p.turnaround}</td></tr>`).join("");
  target.innerHTML=`<h4>CPU Gantt chart</h4><div class="gantt">${blocks}</div><div class="time-labels">${times}</div>
    <div class="metrics"><div class="metric"><span>AVERAGE WAITING TIME</span><b>${result.averageWaiting.toFixed(2)}</b></div>
    <div class="metric"><span>AVERAGE TURNAROUND</span><b>${result.averageTurnaround.toFixed(2)}</b></div></div>
    <div class="table-wrap"><table class="mini-table"><thead><tr><th>PROCESS</th><th>COMPLETION</th><th>WAITING</th><th>TURNAROUND</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
$("runBtn").addEventListener("click",()=>{
  if(!processes.length){message.textContent="Add at least one process before running the simulation.";return;}
  const interval=Number($("agingInterval").value);
  if(!Number.isSafeInteger(interval)||interval<1){message.textContent="Aging interval must be a whole number greater than zero.";return;}
  const without=simulate(processes,false,interval), withAge=simulate(processes,true,interval);
  lastResults={without,withAge}; renderResult("withoutAging",without,false); renderResult("withAging",withAge,true);
  $("comparison").innerHTML=`<div class="table-wrap"><table class="comparison-table"><thead><tr><th>PERFORMANCE METRIC</th><th>WITHOUT AGING</th><th>WITH AGING</th></tr></thead><tbody>
    <tr><td>Average waiting time</td><td>${without.averageWaiting.toFixed(2)}</td><td>${withAge.averageWaiting.toFixed(2)}</td></tr>
    <tr><td>Average turnaround time</td><td>${without.averageTurnaround.toFixed(2)}</td><td>${withAge.averageTurnaround.toFixed(2)}</td></tr>
    <tr><td>Total completion time</td><td>${without.totalTime}</td><td>${withAge.totalTime}</td></tr></tbody></table></div>
    <p class="table-note">Aging can reduce starvation risk, but it does not guarantee lower average waiting or turnaround time for every workload.</p>`;
  $("results").classList.remove("hidden"); message.textContent="Simulation completed successfully.";
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
});
$("sampleBtn").addEventListener("click",()=>{
  processes.splice(0,processes.length,
    {pid:"P1",arrival:0,burst:3,priority:5},{pid:"P2",arrival:1,burst:2,priority:1},
    {pid:"P3",arrival:2,burst:2,priority:1},{pid:"P4",arrival:3,burst:2,priority:1},
    {pid:"P5",arrival:4,burst:2,priority:1},{pid:"P6",arrival:5,burst:2,priority:1});
  renderProcessList();resetResults();message.textContent="Sample workload loaded.";
});
$("clearBtn").addEventListener("click",()=>{
  processes.length=0;renderProcessList();resetResults();message.textContent="All processes cleared.";
});
$("resetBtn").addEventListener("click",()=>{resetResults();message.textContent="Previous simulation results reset.";});
$("exportBtn").addEventListener("click",()=>{
  if(!processes.length){message.textContent="There are no processes to export.";return;}
  const csv=[["Process ID","Arrival Time","Burst Time","Priority"],...processes.map(p=>[p.pid,p.arrival,p.burst,p.priority])]
    .map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a");a.href=url;a.download="priority-scheduling-processes.csv";a.click();URL.revokeObjectURL(url);
  message.textContent="Process list exported as CSV.";
});
$("themeBtn").addEventListener("click",()=>{
  document.body.classList.toggle("dark");const dark=document.body.classList.contains("dark");
  $("themeBtn").innerHTML=dark?"☀ <span>Light mode</span>":"☾ <span>Dark mode</span>";
});
renderProcessList();
