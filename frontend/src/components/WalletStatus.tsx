import { useEffect, useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { CONSTITUTION_ID, PACKAGE_ID } from '../config'
import { formatMist, formatTimestamp } from '../utils/format'

export default function WalletStatus() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [fundAmount, setFundAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [status, setStatus] = useState('')
  const [treasury, setTreasury] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  const fetchTreasury = async () => {
    try {
      const obj = await suiClient.getObject({
        id: CONSTITUTION_ID,
        options: { showContent: true },
      })
      const f = (obj.data?.content as any)?.fields
      if (f) setTreasury(parseInt(f.treasury) / 1e9)

      const [fundEvents, withdrawEvents] = await Promise.all([
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::TreasuryFunded` },
          limit: 10,
          order: 'descending',
        }),
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::TreasuryWithdrawn` },
          limit: 10,
          order: 'descending',
        }),
      ])

      const merged: any[] = []
      fundEvents.data.forEach((e: any) => {
        merged.push({
          type: 'fund',
          amount: e.parsedJson.amount,
          balance: e.parsedJson.new_balance,
          timestamp: e.parsedJson.timestamp,
        })
      })
      withdrawEvents.data.forEach((e: any) => {
        merged.push({
          type: 'withdraw',
          amount: e.parsedJson.amount,
          balance: e.parsedJson.remaining,
          timestamp: e.parsedJson.timestamp,
        })
      })
      merged.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      setHistory(merged)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTreasury()
    const interval = setInterval(fetchTreasury, 5000)
    return () => clearInterval(interval)
  }, [])

  const fundTreasury = async () => {
    if (!account || !fundAmount) return
    setStatus('Funding...')
    const amountMist = Math.floor(parseFloat(fundAmount) * 1e9)
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [amountMist])
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::fund_treasury`,
      arguments: [tx.object(CONSTITUTION_ID), coin, tx.object('0x6')],
    })
    try {
      const res = await signAndExecute({ transaction: tx })
      setStatus(`✅ Funded ${fundAmount} SUI! Tx: ${res.digest}`)
      fetchTreasury()
    } catch (e: any) {
      setStatus(`❌ ${e.message}`)
    }
  }

  const withdrawTreasury = async () => {
    if (!account || !withdrawAmount) return
    setStatus('Withdrawing...')
    const amountMist = Math.floor(parseFloat(withdrawAmount) * 1e9)
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::withdraw_treasury`,
      arguments: [tx.object(CONSTITUTION_ID), tx.pure.u64(amountMist), tx.object('0x6')],
    })
    try {
      const res = await signAndExecute({ transaction: tx })
      setStatus(`✅ Withdrew ${withdrawAmount} SUI! Tx: ${res.digest}`)
      fetchTreasury()
    } catch (e: any) {
      setStatus(`❌ ${e.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <h2>💰 Agent Treasury</h2>

      <div className="panel center">
        <p className="big">{treasury.toFixed(4)} SUI</p>
        <p className="muted">SUI in Treasury</p>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>➕ Fund Treasury</h3>
          <div className="inline-actions">
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount in SUI"
            />
            <button onClick={fundTreasury} disabled={!account}>
              Fund
            </button>
          </div>
        </div>
        <div className="panel">
          <h3>➖ Withdraw Funds</h3>
          <div className="inline-actions">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount in SUI"
            />
            <button onClick={withdrawTreasury} disabled={!account}>
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {status && <p className="muted">{status}</p>}

      <div className="panel">
        <h3>Fund & Withdraw History</h3>
        <div className="table compact">
          {history.map((entry, i) => (
            <div key={i} className="row">
              <div className="cell">
                <p className="big">
                  {entry.type === 'fund' ? '🟢 Funded' : '🔴 Withdrawn'}
                </p>
                <p className="muted">{formatTimestamp(entry.timestamp)}</p>
              </div>
              <div className="cell">
                <p>{formatMist(entry.amount)} SUI</p>
                <p className="muted">Balance: {formatMist(entry.balance)} SUI</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
