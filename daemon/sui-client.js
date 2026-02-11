// ~/AgentForge/daemon/sui-client.js
const { execSync } = require('child_process');
const config = require('./config');

function suiCall(module, func, args, gasBudget = 10000000) {
  const argsStr = args.map((a) => `${a}`).join(' ');
  const cmd = `sui client call \
  --package ${config.PACKAGE_ID} \
  --module ${module} \
  --function ${func} \
  --args ${argsStr} \
  --gas-budget ${gasBudget} \
  --json 2>/dev/null`;

  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (error) {
    console.error(`Sui call failed (${module}::${func}):`, error.message);
    return null;
  }
}

function toHexBytes(str) {
  return '0x' + Buffer.from(str).toString('hex');
}

// Log heartbeat on-chain
async function logHeartbeat(walrusBlobId) {
  return suiCall('constitution', 'heartbeat', [
    config.CONSTITUTION_ID,
    toHexBytes(walrusBlobId),
    '0x6', // Clock
  ]);
}

// Report an action on-chain
async function reportAction(actionType, actionHash, walrusBlobId) {
  return suiCall('constitution', 'report_action', [
    config.FORGE_REGISTRY_ID,
    config.CONSTITUTION_ID,
    toHexBytes(actionType),
    toHexBytes(actionHash),
    toHexBytes(walrusBlobId),
    '0x6', // Clock
  ]);
}

// Authorize a spend on-chain
async function authorizeSpend(amount, category, reasonHash, walrusBlobId) {
  return suiCall('constitution', 'authorize_spend', [
    config.FORGE_REGISTRY_ID,
    config.CONSTITUTION_ID,
    amount.toString(),
    toHexBytes(category),
    toHexBytes(reasonHash),
    toHexBytes(walrusBlobId),
    '0x6', // Clock
  ]);
}

module.exports = { suiCall, toHexBytes, logHeartbeat, reportAction, authorizeSpend };
