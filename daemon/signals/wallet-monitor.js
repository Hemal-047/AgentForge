// ~/AgentForge/daemon/signals/wallet-monitor.js
const { execSync } = require('child_process');
const config = require('../config');

function checkWalletBalance() {
  try {
    const result = execSync('sui client balance --json 2>/dev/null', {
      encoding: 'utf8',
      timeout: 15000,
    });
    const balances = JSON.parse(result);
    const sui = balances.find((b) => b.coinType?.includes('SUI'));
    const balance = sui ? parseInt(sui.totalBalance || '0') : 0;

    return {
      signal: 'wallet_balance',
      balance_mist: balance,
      balance_sui: balance / 1_000_000_000,
      is_low: balance < config.LOW_BALANCE_THRESHOLD,
      threshold: config.LOW_BALANCE_THRESHOLD,
    };
  } catch (error) {
    return { signal: 'wallet_balance', error: error.message };
  }
}

module.exports = { checkWalletBalance };
