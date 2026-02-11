// ~/AgentForge/daemon/signals/server-health.js
const { execSync } = require('child_process');
const os = require('os');
const config = require('../config');

function checkServerHealth() {
  const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

  let diskUsage = 0;
  try {
    const df = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' });
    diskUsage = parseInt(df.replace('%', ''));
  } catch (e) {}

  const uptime = os.uptime();

  return {
    signal: 'server_health',
    cpu_percent: cpuUsage.toFixed(1),
    memory_percent: memUsage,
    disk_percent: diskUsage,
    uptime_hours: (uptime / 3600).toFixed(1),
    cpu_alert: cpuUsage > config.HIGH_CPU_THRESHOLD,
    disk_alert: diskUsage > config.HIGH_DISK_THRESHOLD,
  };
}

module.exports = { checkServerHealth };
