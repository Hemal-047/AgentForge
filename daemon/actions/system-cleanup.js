// ~/AgentForge/daemon/actions/system-cleanup.js
const { execSync } = require('child_process');

function cleanupLogs() {
  try {
    // Clean old logs
    execSync('find /tmp -name "*.log" -mtime +1 -delete 2>/dev/null');
    // Clean npm cache
    execSync('npm cache clean --force 2>/dev/null');
    return { action: 'cleanup', success: true, cleaned: ['tmp_logs', 'npm_cache'] };
  } catch (error) {
    return { action: 'cleanup', success: false, error: error.message };
  }
}

module.exports = { cleanupLogs };
