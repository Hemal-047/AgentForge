// ~/AgentForge/daemon/actions/send-alert.js
// For hackathon demo, alerts go to console.
// In production, this would send to Telegram/Slack/email.
function sendAlert(level, message, details = {}) {
  const icons = { info: 'ℹ️', warning: '⚠️', critical: '🚨', success: '✅' };
  const icon = icons[level] || '📢';
  console.log(`${icon} [ALERT:${level.toUpperCase()}] ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(' Details:', JSON.stringify(details, null, 2));
  }
  return { level, message, details, timestamp: new Date().toISOString() };
}

module.exports = { sendAlert };
