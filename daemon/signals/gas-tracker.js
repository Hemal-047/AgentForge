// ~/AgentForge/daemon/signals/gas-tracker.js
async function checkGasPrice() {
  try {
    const response = await fetch('https://fullnode.testnet.sui.io:443', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getReferenceGasPrice',
        params: [],
      }),
    });
    const data = await response.json();
    const gasPrice = parseInt(data.result || '1000');
    return { signal: 'gas_price', price_mist: gasPrice, is_cheap: gasPrice < 1000 };
  } catch (error) {
    return { signal: 'gas_price', error: error.message };
  }
}

module.exports = { checkGasPrice };
