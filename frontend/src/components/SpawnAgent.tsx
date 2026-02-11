import { useMemo, useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, REGISTRY_ID } from '../config'

export default function SpawnAgent() {
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [name, setName] = useState('AgentForge Spawn')
  const [description, setDescription] = useState('Economically autonomous agent')
  const [agentAddress, setAgentAddress] = useState('')
  const [dailyLimit, setDailyLimit] = useState('1.0')
  const [actionLimit, setActionLimit] = useState('0.2')
  const [initialFunds, setInitialFunds] = useState('0.5')
  const [status, setStatus] = useState('')

  const effectiveAgentAddress = useMemo(
    () => agentAddress || account?.address || '',
    [agentAddress, account?.address],
  )

  const toMist = (value: string) => Math.floor(parseFloat(value || '0') * 1e9)

  const spawn = async () => {
    if (!account) {
      setStatus('Connect a wallet first.')
      return
    }
    if (!name || !description || !effectiveAgentAddress) {
      setStatus('Please fill all fields.')
      return
    }

    const tx = new Transaction()
    const initialFundsMist = toMist(initialFunds)
    const dailyLimitMist = toMist(dailyLimit)
    const actionLimitMist = toMist(actionLimit)
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(initialFundsMist)])

    tx.moveCall({
      target: `${PACKAGE_ID}::constitution::spawn_agent`,
      arguments: [
        tx.object(REGISTRY_ID),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(name))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
        tx.pure.address(effectiveAgentAddress),
        tx.pure.u64(dailyLimitMist),
        tx.pure.u64(actionLimitMist),
        coin,
        tx.object('0x6'),
      ],
    })

    try {
      const result = await signAndExecute({ transaction: tx })
      setStatus(
        `✅ Agent spawned! Tx: ${result.digest}. Check SuiScan for your new AgentConstitution object.`,
      )
    } catch (e: any) {
      setStatus(`❌ ${e.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <h2>Spawn Your Own Agent</h2>
      <p className="muted">
        Create a brand new agent constitution on-chain. This does not affect the
        default dashboard agent.
      </p>

      <div className="panel">
        <div className="form-grid">
          <label>
            Agent Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent name"
            />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </label>
          <label>
            Agent Address
            <input
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              placeholder={account?.address || 'Wallet address'}
            />
          </label>
          <label>
            Daily Spend Limit (SUI)
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
          </label>
          <label>
            Per-Action Limit (SUI)
            <input
              type="number"
              value={actionLimit}
              onChange={(e) => setActionLimit(e.target.value)}
            />
          </label>
          <label>
            Initial Treasury (SUI)
            <input
              type="number"
              value={initialFunds}
              onChange={(e) => setInitialFunds(e.target.value)}
            />
          </label>
        </div>

        <button onClick={spawn} disabled={!account}>
          Spawn Agent
        </button>
        {status && <p className="muted">{status}</p>}
      </div>

      <div className="panel">
        <p className="muted">
          Your agent has been created on-chain! To connect a daemon, clone the repo
          and set your CONSTITUTION_ID in daemon/config.js.
        </p>
      </div>
    </div>
  )
}
