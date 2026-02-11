// ~/AgentForge/daemon/walrus-logger.js
const crypto = require('crypto');
const config = require('./config');

async function logToWalrus(data) {
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
    agent: 'AgentForge Prime',
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await fetch(`${config.WALRUS_PUBLISHER}/v1/blobs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: Buffer.from(JSON.stringify(payload)),
    });

    const result = await response.json();
    const blobId =
      result.newlyCreated?.blobObject?.blobId ||
      result.alreadyCertified?.blobId ||
      `upload_failed_${Date.now()}`;

    console.log(`📦 Walrus: ${blobId.slice(0, 16)}... | Hash: ${hash.slice(0, 16)}...`);
    return { blobId, hash };
  } catch (error) {
    console.error('Walrus upload failed:', error.message);
    return { blobId: `upload_failed_${Date.now()}`, hash };
  }
}

module.exports = { logToWalrus };
