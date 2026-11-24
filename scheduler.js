// Preemptive Priority Scheduling. Priority 1 is highest.
// Aging improves the effective priority of processes waiting in the ready queue.
function simulate(processes, useAging, agingInterval) {
  const jobs = processes.map((p, index) => ({
    ...p, originalPriority: p.priority, effectivePriority: p.priority,
    remaining: p.burst, completion: null, waiting: 0, turnaround: 0,
    readyWait: 0, order: index
  }));
  const timeline = [];
  let time = 0, completed = 0;
  const maxTime = jobs.reduce((m, p) => Math.max(m, p.arrival), 0) +
                  jobs.reduce((s, p) => s + p.burst, 0) + 10000;
 
  while (completed < jobs.length && time < maxTime) {
    const ready = jobs.filter(p => p.arrival <= time && p.remaining > 0);
    if (!ready.length) {
      const last = timeline[timeline.length - 1];
      if (last && last.pid === "Idle" && last.end === time) last.end++;
      else timeline.push({pid:"Idle", start:time, end:time+1});
      time++;
      continue;
    }
 
    ready.sort((a,b) => a.effectivePriority-b.effectivePriority ||
      a.arrival-b.arrival || a.order-b.order);
    const current = ready[0];
 
    // Waiting ready processes gain one priority level after each full aging interval.
    if (useAging) {
      for (const p of ready) {
        if (p !== current) {
          p.readyWait++;
          if (p.readyWait >= agingInterval) {
            p.effectivePriority = Math.max(1, p.effectivePriority - 1);
            p.readyWait = 0;
          }
        }
      }
    }
 
    const last = timeline[timeline.length - 1];
    if (last && last.pid === current.pid && last.end === time) last.end++;
    else timeline.push({pid:current.pid, start:time, end:time+1});
    current.remaining--;
    time++;
 
    if (current.remaining === 0) {
      current.completion = time;
      current.turnaround = current.completion - current.arrival;
      current.waiting = current.turnaround - current.burst;
      completed++;
    }
  }
 
  const averageWaiting = jobs.reduce((s,p)=>s+p.waiting,0)/jobs.length;
  const averageTurnaround = jobs.reduce((s,p)=>s+p.turnaround,0)/jobs.length;
  return {jobs, timeline, averageWaiting, averageTurnaround, totalTime:time};
}
