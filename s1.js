// Preemptive Priority Scheduling.
// Priority 1 is highest. Lower number = higher priority.
function simulate(processes, useAging, agingInterval) {
  const jobs = processes.map((p, index) => ({
    ...p,
    originalPriority: p.priority,
    remaining: p.burst,
    completion: null,
    waiting: 0,
    turnaround: 0,
    readyWait: 0,
    order: index
  }));

  const timeline = [];
  let time = 0;
  let completed = 0;

  while (completed < jobs.length) {
    const ready = jobs.filter(p => p.arrival <= time && p.remaining > 0);

    if (ready.length === 0) {
      timeline.push({ pid: "Idle", start: time, end: time + 1 });
      time++;
      continue;
    }

    ready.sort((a, b) =>
      a.priority - b.priority ||
      a.arrival - b.arrival ||
      a.order - b.order
    );

    const current = ready[0];

    if (useAging) {
      for (const p of ready) {
        if (p !== current) {
          p.readyWait++;
          if (p.readyWait >= agingInterval) {
            p.priority = Math.max(1, p.priority - 1);
            p.readyWait = 0;
          }
        }
      }
    }

    const last = timeline[timeline.length - 1];
    if (last && last.pid === current.pid && last.end === time) {
      last.end++;
    } else {
      timeline.push({ pid: current.pid, start: time, end: time + 1 });
    }

    current.remaining--;
    time++;

    if (current.remaining === 0) {
      current.completion = time;
      current.turnaround = current.completion - current.arrival;
      current.waiting = current.turnaround - current.burst;
      completed++;
    }
  }

  const averageWaiting =
    jobs.reduce((sum, p) => sum + p.waiting, 0) / jobs.length;
  const averageTurnaround =
    jobs.reduce((sum, p) => sum + p.turnaround, 0) / jobs.length;

  return { jobs, timeline, averageWaiting, averageTurnaround };
}