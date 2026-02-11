import { useEffect, useState } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { PACKAGE_ID } from '../config'
import { decodeBytes, formatMist, formatTimestamp } from '../utils/format'

type HeartbeatEntry = {
  number: string
  treasuryBalance: string
  walrusBlobId: string
  timestamp: string
}

export default function Heartbeat() {
  const suiClient = useSuiClient()
  const [heartbeats, setHeartbeats] = useState<HeartbeatEntry[]>([])
  const [pulseAnim, setPulseAnim] = useState(false)

  const fetchHeartbeats = async () => {
    try {
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::constitution::HeartbeatLogged` },
        limit: 20,
        order: 'descending',
      })
      const parsed = events.data.map((e: any) => ({
        number: String(e.parsedJson.heartbeat_number),
        treasuryBalance: String(e.parsedJson.treasury_balance),
        walrusBlobId: decodeBytes(e.parsedJson.walrus_blob_id),
        timestamp: formatTimestamp(e.parsedJson.timestamp),
      }))
      setHeartbeats(parsed)
      setPulseAnim(true)
      setTimeout(() => setPulseAnim(false), 800)
    } catch (error) {
      console.error('Failed to fetch heartbeats:', error)
    }
  }

  useEffect(() => {
    fetchHeartbeats()
    const interval = setInterval(fetchHeartbeats, 5000)
    return () => clearInterval(interval)
  }, [])

  const latest = heartbeats[0]

  return (
    <div className="space-y-6">
      <div className="pulse-header">
        <div>
          <h2>Agent Pulse</h2>
          <p className="muted">Real-time heartbeat from AgentForge</p>
        </div>
        <div className="pulse-indicator">
          <div
            className={`pulse-dot ${pulseAnim ? 'pulse-active' : ''}`}
          />
          <span className="muted">{latest ? `#${latest.number}` : '...'}</span>
        </div>
      </div>

      {latest && (
        <div className="cards">
          <div className="card">
            <h3>Total Heartbeats</h3>
            <p className="big ok">{latest.number}</p>
          </div>
          <div className="card">
            <h3>Treasury (SUI)</h3>
            <p className="big">{formatMist(latest.treasuryBalance)}</p>
          </div>
          <div className="card">
            <h3>Last Heartbeat</h3>
            <p className="big">{latest.timestamp}</p>
          </div>
        </div>
      )}

      <div className="table">
        {heartbeats.map((hb, i) => (
          <div
            key={`${hb.number}-${i}`}
            className={`row ${i === 0 && pulseAnim ? 'row-highlight' : ''}`}
          >
            <div className="cell">
              <p className="big">💚 #{hb.number}</p>
              <p className="muted">{hb.timestamp}</p>
            </div>
            <div className="cell">
              <p>Treasury: {formatMist(hb.treasuryBalance)} SUI</p>
              <p className="muted">Walrus {hb.walrusBlobId.slice(0, 16)}…</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
