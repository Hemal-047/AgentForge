// ~/AgentForge/daemon/config.js
module.exports = {
  // UPDATE THESE after deploying
  PACKAGE_ID: '0xab49ca7690599376c4e0481b0f9e1808dd03278aa4c4dbabdf7eb08aa53ac269',
  FORGE_REGISTRY_ID: '0xbd1b3de5ab4348a9f89c44c1e60fa1b9fd44804c4b8c0fd8d72a4fe87bef6bac',
  CONSTITUTION_ID: '0x4aa7af3f28d200bd3c7e532e4f4fe3290a3a1a83a58a61d7b4a38cb99a33dc77',

  // Sui
  SUI_NETWORK: 'testnet',
  SUI_RPC: 'https://fullnode.testnet.sui.io:443',

  // Walrus
  WALRUS_PUBLISHER: 'https://publisher.walrus-testnet.walrus.space',
  WALRUS_AGGREGATOR: 'https://aggregator.walrus-testnet.walrus.space',

  // Heartbeat interval (ms)
  HEARTBEAT_INTERVAL: 10 * 60 * 1000, // 10 minutes

  // Signal check interval (ms)
  SIGNAL_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // Alerts
  LOW_BALANCE_THRESHOLD: 100000000, // 0.1 SUI — alert if treasury below this
  HIGH_DISK_THRESHOLD: 80, // alert if disk usage above 80%
  HIGH_CPU_THRESHOLD: 90, // alert if CPU above 90%
};
