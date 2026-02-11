import { useEffect, useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { CONSTITUTION_ID, PACKAGE_ID } from '../config'
import { decodeBytes, formatMist } from '../utils/format'

export default function Constitution() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [constitution, setConstitution] = useState<any>(null)
  const [newDailyLimit, setNewDailyLimit] = useState('')
  const [newActionLimit, setNewActionLimit] = useState('')
  const [status, setStatus] = useState('')

  const fetchConstitution = async () => {
    try {
      const obj = await suiClient.getObject({
        id: CONSTITUTION_ID,
        options: { showContent: true },
      })
      const fields = (obj.data?.content as any)?.fields
      if (fields) setConstitution(fields)
    } catch (error) {
      console.error('Failed to fetch constitution:', error)
    }
  }

  useEffect(() => {
    fetchConstitution()
    const interval = setInterval(fetchConstitution, 5000)
    return () => clearInterval(interval)
  }, [])

  const updateDailyLimit = async () => {
    if (!account || !newDailyLimit) return
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::update_daily_limit`,
      arguments: [
        tx.object(CONSTITUTION_ID),
        tx.pure.u64(Math.floor(parseFloat(newDailyLimit) * 1e9)),
      ],
    })
    try {
      const res = await signAndExecute({ transaction: tx })
      setStatus(`✅ Daily limit updated! Tx: ${res.digest}`)
      fetchConstitution()
    } catch (e: any) {
      setStatus(`❌ ${e.message}`)
    }
  }

  const updateActionLimit = async () => {
    if (!account || !newActionLimit) return
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::update_action_limit`,
      arguments: [
        tx.object(CONSTITUTION_ID),
        tx.pure.u64(Math.floor(parseFloat(newActionLimit) * 1e9)),
      ],
    })
    try {
      const res = await signAndExecute({ transaction: tx })
      setStatus(`✅ Action limit updated! Tx: ${res.digest}`)
      fetchConstitution()
    } catch (e: any) {
      setStatus(`❌ ${e.message}`)
    }
  }

  if (!constitution) return <div className="muted">Loading constitution...</div>

  const dailyLimit = parseInt(constitution.daily_spend_limit) / 1e9
  const spentToday = parseInt(constitution.total_spent_today) / 1e9
  const spentAll = parseInt(constitution.total_spent_all_time) / 1e9
  const actionLimit = parseInt(constitution.per_action_limit) / 1e9
  const treasury = parseInt(constitution.treasury) / 1e9
  const pctUsed = dailyLimit > 0 ? (spentToday / dailyLimit) * 100 : 0

  return (
    <div className="space-y-6">
      <h2>📜 Agent Constitution</h2>
      <p className="muted">
        Blockchain-enforced rules. The agent cannot violate these — the smart
        contract prevents it.
      </p>

      <div className="cards">
        <div className="card">
          <p className={`big ${constitution.is_alive ? 'ok' : 'bad'}`}>
            {constitution.is_alive ? '🟢 ALIVE' : '🔴 DEAD'}
          </p>
          <p className="muted">Status</p>
        </div>
        <div className="card">
          <p className="big">{formatMist(treasury * 1e9)} SUI</p>
          <p className="muted">Treasury Balance</p>
        </div>
        <div className="card">
          <p className="big">{constitution.total_actions}</p>
          <p className="muted">Total Actions</p>
        </div>
      </div>

      <div className="panel">
        <h3>Daily Budget</h3>
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
        <p className="muted">
          {spentToday.toFixed(4)} / {dailyLimit.toFixed(4)} SUI ({pctUsed.toFixed(0)}%)
        </p>
        <div className="grid">
          <div className="panel">
            <p className="muted">Per-Action Limit</p>
            <p className="big">{actionLimit.toFixed(4)} SUI</p>
          </div>
          <div className="panel">
            <p className="muted">All-Time Spent</p>
            <p className="big">{spentAll.toFixed(4)} SUI</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Adjust Limits (Owner Only)</h3>
        <div className="inline-actions">
          <input
            type="number"
            value={newDailyLimit}
            onChange={(e) => setNewDailyLimit(e.target.value)}
            placeholder={dailyLimit.toString()}
          />
          <button onClick={updateDailyLimit} disabled={!account}>
            Update Daily Limit
          </button>
        </div>
        <div className="inline-actions">
          <input
            type="number"
            value={newActionLimit}
            onChange={(e) => setNewActionLimit(e.target.value)}
            placeholder={actionLimit.toString()}
          />
          <button onClick={updateActionLimit} disabled={!account}>
            Update Action Limit
          </button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>

      <div className="panel">
        <h3>Agent Identity</h3>
        <p>Owner: {constitution.owner}</p>
        <p>Agent: {constitution.agent}</p>
        <p>Name: {decodeBytes(constitution.name)}</p>
        <p>Created: {new Date(parseInt(constitution.created_at)).toLocaleString()}</p>
      </div>
    </div>
  )
}
