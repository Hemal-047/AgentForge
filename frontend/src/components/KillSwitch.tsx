import { useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { CONSTITUTION_ID, PACKAGE_ID } from '../config'

export default function KillSwitch() {
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [confirming, setConfirming] = useState(false)

  const killAgent = async () => {
    if (!account) return
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::kill_agent`,
      arguments: [
        tx.object(CONSTITUTION_ID),
        tx.pure.vector(
          'u8',
          Array.from(
            new TextEncoder().encode('Manual kill switch activated from dashboard'),
          ),
        ),
        tx.object('0x6'),
      ],
    })
    await signAndExecute({ transaction: tx })
    setConfirming(false)
  }

  const reviveAgent = async () => {
    if (!account) return
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::revive_agent`,
      arguments: [tx.object(CONSTITUTION_ID), tx.object('0x6')],
    })
    await signAndExecute({ transaction: tx })
  }

  if (confirming) {
    return (
      <div className="kill-confirm">
        <span className="muted">Kill agent?</span>
        <button onClick={killAgent} className="danger">
          YES
        </button>
        <button onClick={() => setConfirming(false)}>Cancel</button>
      </div>
    )
  }

  return (
    <div className="kill-actions">
      <button onClick={() => setConfirming(true)} disabled={!account} className="danger">
        🔴 KILL
      </button>
      <button onClick={reviveAgent} disabled={!account} className="success">
        🟢 REVIVE
      </button>
    </div>
  )
}
