import { useEffect, useMemo, useState } from 'react'
import { ConnectButton, useSuiClient } from '@mysten/dapp-kit'
import './App.css'
import { CONSTITUTION_ID, PACKAGE_ID } from './config'
import { formatMist } from './utils/format'
import Heartbeat from './components/Heartbeat'
import ActionFeed from './components/ActionFeed'
import ActionCatalog from './components/ActionCatalog'
import Constitution from './components/Constitution'
import WalletStatus from './components/WalletStatus'
import KillSwitch from './components/KillSwitch'

const tabs = ['Pulse', 'Actions', 'Capabilities', 'Constitution', 'Treasury']

export default function App() {
  const client = useSuiClient()
  const [tab, setTab] = useState(tabs[0])
  const [stats, setStats] = useState({
    heartbeats: 0,
    actions: 0,
    denials: 0,
    spentMist: 0,
  })

  const fetchStats = async () => {
    try {
      const [constitutionRes, deniedRes] = await Promise.all([
        client.getObject({
          id: CONSTITUTION_ID,
          options: { showContent: true },
        }),
        client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::SpendDenied` },
          limit: 50,
          order: 'descending',
        }),
      ])

      const fields = (constitutionRes.data?.content as any)?.fields || {}
      setStats({
        heartbeats: Number(fields.total_heartbeats || 0),
        actions: Number(fields.total_actions || 0),
        denials: deniedRes.data.length,
        spentMist: Number(fields.total_spent_all_time || 0),
      })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const spentSui = useMemo(() => formatMist(stats.spentMist), [stats.spentMist])

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>AgentForge</h1>
          <p className="sub">Economically autonomous agent on Sui</p>
        </div>
        <div className="header-actions">
          <KillSwitch />
          <ConnectButton />
        </div>
      </header>

      <div className="stats-bar">
        <div>
          <p className="muted">Heartbeats</p>
          <p className="big">{stats.heartbeats}</p>
        </div>
        <div>
          <p className="muted">Actions</p>
          <p className="big">{stats.actions}</p>
        </div>
        <div>
          <p className="muted">Denials</p>
          <p className="big">{stats.denials}</p>
        </div>
        <div>
          <p className="muted">SUI Spent</p>
          <p className="big">{spentSui}</p>
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={item === tab ? 'active' : ''}
          >
            {item}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'Pulse' && <Heartbeat />}
        {tab === 'Actions' && <ActionFeed />}
        {tab === 'Capabilities' && <ActionCatalog />}
        {tab === 'Constitution' && <Constitution />}
        {tab === 'Treasury' && <WalletStatus />}
      </main>
    </div>
  )
}
