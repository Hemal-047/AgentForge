// ~/AgentForge/daemon/heartbeat.js
const config = require('./config');
const { logToWalrus } = require('./walrus-logger');
const { logHeartbeat, reportAction } = require('./sui-client');
const { checkWalletBalance } = require('./signals/wallet-monitor');
const { checkServerHealth } = require('./signals/server-health');
const { checkGasPrice } = require('./signals/gas-tracker');
const { sendAlert } = require('./actions/send-alert');
const { cleanupLogs } = require('./actions/system-cleanup');

let heartbeatCount = 0;
let actionCount = 0;

async function runHeartbeat() {
  heartbeatCount++;
  console.log(` ${'='.repeat(60)}`);
  console.log(`💚 HEARTBEAT #${heartbeatCount} — ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  // ===== SENSE: Gather all signals =====
  console.log(' 📡 Checking signals...');
  const wallet = checkWalletBalance();
  console.log(` 💰 Wallet: ${wallet.balance_sui} SUI ${wallet.is_low ? '⚠️ LOW' : '✅'}`);
  const health = checkServerHealth();
  console.log(` 🖥️ CPU: ${health.cpu_percent}% | RAM: ${health.memory_percent}% | Disk: ${health.disk_percent}%`);
  const gas = await checkGasPrice();
  console.log(` ⛽ Gas: ${gas.price_mist} MIST ${gas.is_cheap ? '💚 cheap' : ''}`);

  // ===== DECIDE: Evaluate conditions =====
  const alerts = [];
  const actions = [];

  if (wallet.is_low) {
    alerts.push(sendAlert('critical', `Treasury low: ${wallet.balance_sui} SUI`, wallet));
  }

  if (health.disk_alert) {
    alerts.push(sendAlert('warning', `Disk usage high: ${health.disk_percent}%`, health));
    actions.push({ type: 'system_cleanup', reason: 'Disk usage exceeded threshold' });
  }

  if (health.cpu_alert) {
    alerts.push(sendAlert('warning', `CPU high: ${health.cpu_percent}%`, health));
  }

  // ===== ACT: Execute actions =====
  for (const action of actions) {
    console.log(` ⚡ Executing: ${action.type}`);
    if (action.type === 'system_cleanup') {
      const result = cleanupLogs();
      console.log(' Result:', result);

      // Log action to Walrus + on-chain
      const { blobId, hash } = await logToWalrus({
        type: 'action_executed',
        action: action.type,
        reason: action.reason,
        result,
      });
      await reportAction(action.type, hash, blobId);
      actionCount++;
    }
  }

  // ===== LOG: Record heartbeat =====
  const heartbeatData = {
    type: 'heartbeat',
    number: heartbeatCount,
    signals: { wallet, health, gas },
    alerts_triggered: alerts.length,
    actions_taken: actions.length,
    total_actions: actionCount,
  };

  const { blobId } = await logToWalrus(heartbeatData);
  const txResult = await logHeartbeat(blobId);
  if (txResult) {
    console.log(` ✅ Heartbeat #${heartbeatCount} logged on-chain. Digest: ${txResult.digest}`);
  }

  console.log(` 📊 Stats: ${heartbeatCount} heartbeats | ${actionCount} actions | ${alerts.length} alerts this cycle`);
  console.log(`⏰ Next heartbeat in ${config.HEARTBEAT_INTERVAL / 60000} minutes... `);
}

// ===== START =====
async function main() {
  console.log(` ╔═══════════════════════════════════════════╗
 ║ 🔥 AGENTFORGE PRIME 🔥                    ║
 ║ Economically Autonomous Agent on Sui      ║
 ╠═══════════════════════════════════════════╣
 ║ Constitution: ${config.CONSTITUTION_ID?.slice(0, 16)}...         ║
 ║ Registry: ${config.FORGE_REGISTRY_ID?.slice(0, 16)}...             ║
 ║ Interval: ${config.HEARTBEAT_INTERVAL / 60000} min               ║
 ╚═══════════════════════════════════════════╝ `);

  // Initial heartbeat
  await runHeartbeat();

  // Schedule recurring heartbeats
  setInterval(runHeartbeat, config.HEARTBEAT_INTERVAL);
}

main().catch(console.error);
