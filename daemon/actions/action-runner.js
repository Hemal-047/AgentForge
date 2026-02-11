const crypto = require('crypto');
const { logToWalrus } = require('../walrus-logger');
const { authorizeSpend, reportAction } = require('../sui-client');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function runAction(action) {
  const payload = {
    type: action.type,
    category: action.category,
    amount_mist: action.amountMist || 0,
    amount_sui: action.amountMist ? action.amountMist / 1_000_000_000 : 0,
    details: action.details || {},
  };

  const { blobId, hash } = await logToWalrus({
    type: 'action_request',
    action: payload,
  });

  let spendDigest = null;
  if (action.amountMist && action.amountMist > 0) {
    const spendResult = await authorizeSpend(
      action.amountMist,
      action.category || 'general',
      hashPayload(payload),
      blobId,
    );

    spendDigest =
      spendResult?.digest ||
      spendResult?.effects?.transactionDigest ||
      spendResult?.transactionDigest ||
      null;

    if (!spendResult) {
      console.log(`❌ Spend denied for ${action.type}`);
      return { ok: false, denied: true, walrusBlobId: blobId, spendDigest };
    }
  }

  const reportResult = await reportAction(action.type, hash, blobId);
  const reportDigest =
    reportResult?.digest ||
    reportResult?.effects?.transactionDigest ||
    reportResult?.transactionDigest ||
    null;

  console.log(`✅ Action reported: ${action.type}`);
  return {
    ok: true,
    denied: false,
    walrusBlobId: blobId,
    spendDigest,
    reportDigest,
  };
}

module.exports = { runAction };
