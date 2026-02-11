import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getFullnodeUrl } from '@mysten/sui/client'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import '@mysten/dapp-kit/dist/index.css'
import './index.css'
import App from './App'

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SuiClientProvider networks={networks} defaultNetwork="testnet">
      <WalletProvider autoConnect>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  </StrictMode>,
)
