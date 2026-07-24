import React, { useState, useEffect } from 'react';
import type { KnowledgeGraph } from '../types';

interface WalletsProps {
  data: KnowledgeGraph;
}

export default function Wallets({ data }: WalletsProps) {
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Custom wallet connection state
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const [userEthBalance, setUserEthBalance] = useState<string | null>(null);
  const [userChainId, setUserChainId] = useState<string | null>(null);

  // Interactive Calldata Generator State
  const [paymentType, setPaymentType] = useState<'subscription' | 'tip' | 'ppv'>('subscription');
  const [creatorWalletInput, setCreatorWalletInput] = useState('0x1111111111111111111111111111111111111111');
  const [amountUsdcInput, setAmountUsdcInput] = useState('10.00');
  const [relatedIdInput, setRelatedIdInput] = useState('tier_gold_vip_001');

  const treasuryAddress = '0x71c3a2891A15245d2416C77eb460B274AB1C7903';
  const deployerKey = 'b4eb01a9a2ec2fcc02a8408ccefe745e46a0a9ed27778528e047b7e32456f593';
  const cdpProjectId = '45b6cb1d-a02b-4525-841c-020852e1f3ed';
  const cdpApiKeyId = '911bf132-7562-4418-a672-61baacf6114d';
  const usdcTestnetAddress = '0x036eFd9011037348926609f2A377B6729024D914';

  const fetchTreasuryBalance = async () => {
    setIsLoadingBalance(true);
    try {
      // Query Base Sepolia RPC directly
      const rpcUrl = 'https://sepolia.base.org';
      
      // 1. Fetch ETH Balance
      const ethRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [treasuryAddress, 'latest'],
        }),
      });
      const ethData = await ethRes.json();
      if (ethData.result) {
        const wei = BigInt(ethData.result);
        const eth = (Number(wei) / 1e18).toFixed(4);
        setEthBalance(eth);
      }

      // 2. Fetch USDC Balance via balanceOf(address)
      const balanceOfData = '0x70a08231' + treasuryAddress.slice(2).padStart(64, '0');
      const usdcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [{ to: usdcTestnetAddress, data: balanceOfData }, 'latest'],
        }),
      });
      const usdcData = await usdcRes.json();
      if (usdcData.result && usdcData.result !== '0x') {
        const usdcUnits = BigInt(usdcData.result);
        const usdc = (Number(usdcUnits) / 1e6).toFixed(2);
        setUsdcBalance(usdc);
      } else {
        setUsdcBalance('0.00');
      }
    } catch (err) {
      console.error('Failed to fetch on-chain balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchTreasuryBalance();
  }, []);

  const connectBrowserWallet = async () => {
    const eth = (window as any).ethereum;
    if (eth) {
      try {
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setUserWallet(accounts[0]);
          const chainId = await eth.request({ method: 'eth_chainId' });
          setUserChainId(chainId);

          const balHex = await eth.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest'],
          });
          const ethVal = (Number(BigInt(balHex)) / 1e18).toFixed(4);
          setUserEthBalance(ethVal);
        }
      } catch (e: any) {
        alert('Failed to connect wallet: ' + e.message);
      }
    } else {
      alert('MetaMask / Web3 provider not found in browser.');
    }
  };

  // Helper to generate dynamic calldata
  const stringToBytes32 = (str: string): string => {
    if (!str) return '0'.repeat(64);
    const clean = str.replace(/-/g, '');
    if (/^[0-9a-fA-F]{64}$/.test(clean)) return clean.toLowerCase();
    let hex = '';
    for (let i = 0; i < str.length && i < 32; i++) {
      hex += str.charCodeAt(i).toString(16);
    }
    return hex.padEnd(64, '0');
  };

  const getEncodedCalldata = () => {
    const amountWei = BigInt(Math.round(parseFloat(amountUsdcInput || '0') * 1e6));
    const tokenPadded = usdcTestnetAddress.slice(2).toLowerCase().padStart(64, '0');
    const creatorPadded = creatorWalletInput.replace(/^0x/, '').toLowerCase().padStart(64, '0');
    const amountPadded = amountWei.toString(16).padStart(64, '0');
    const idPadded = stringToBytes32(relatedIdInput);

    if (paymentType === 'subscription') {
      return `0x7158d140${tokenPadded}${creatorPadded}${amountPadded}${idPadded}`;
    } else if (paymentType === 'tip') {
      return `0x7b6c03b7${tokenPadded}${creatorPadded}${amountPadded}`;
    } else {
      return `0xf6ad20a7${tokenPadded}${creatorPadded}${amountPadded}${idPadded}`;
    }
  };

  const amountUsdcNum = parseFloat(amountUsdcInput) || 0;
  const platformFee = (amountUsdcNum * 0.125).toFixed(2);
  const creatorPayout = (amountUsdcNum * 0.875).toFixed(2);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#f3f4f6' }}>
          🌐 Blockchain & Wallet Inspector
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '15px' }}>
          Live inspection portal for Coinbase Developer Platform (CDP), Base Sepolia testnet contracts, platform treasury wallets, and transaction payloads.
        </p>
      </header>

      {/* Grid Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Card 1: CDP Integration */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#38bdf8', margin: 0 }}>⚡ Coinbase CDP Configuration</h3>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
              Active
            </span>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ color: '#64748b' }}>CDP Project ID:</span>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', marginTop: '4px' }}>
                {cdpProjectId}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>CDP API Key ID:</span>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', marginTop: '4px' }}>
                {cdpApiKeyId}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Auth Algorithm:</span>
              <span style={{ color: '#4ade80', marginLeft: '8px', fontWeight: 'bold' }}>Ed25519 (EdDSA JWT)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Platform Treasury Wallet */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#a855f7', margin: 0 }}>🏦 Platform Treasury & Deployer</h3>
            <button 
              onClick={fetchTreasuryBalance} 
              disabled={isLoadingBalance}
              style={{ background: '#334155', border: 'none', color: '#e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
            >
              {isLoadingBalance ? 'Refreshing...' : '🔄 Refresh On-Chain'}
            </button>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ color: '#64748b' }}>Public Treasury Address:</span>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', color: '#c084fc', marginTop: '4px', wordBreak: 'break-all' }}>
                {treasuryAddress}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Base Sepolia ETH</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f3f4f6' }}>
                  {ethBalance !== null ? `${ethBalance} ETH` : 'Loading...'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Base Sepolia USDC</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>
                  {usdcBalance !== null ? `$${usdcBalance} USDC` : 'Loading...'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <a 
                href={`https://sepolia.basescan.org/address/${treasuryAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', fontSize: '12px', textDecoration: 'none' }}
              >
                ↗ View on BaseScan
              </a>
              <button 
                onClick={() => setShowKey(!showKey)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showKey ? 'Hide Private Key' : 'Reveal Private Key'}
              </button>
            </div>
            {showKey && (
              <div style={{ fontFamily: 'monospace', background: '#450a0a', border: '1px solid #991b1b', padding: '6px 10px', borderRadius: '6px', color: '#fca5a5', fontSize: '11px', wordBreak: 'break-all' }}>
                0x{deployerKey}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Network & Contract Info */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#22c55e', margin: 0 }}>⛓️ Smart Contract Protocol</h3>
            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
              Base Sepolia (84532)
            </span>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ color: '#64748b' }}>RPC Endpoint:</span>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', marginTop: '4px' }}>
                https://sepolia.base.org
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Testnet USDC Token Address:</span>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', color: '#4ade80', marginTop: '4px', wordBreak: 'break-all' }}>
                {usdcTestnetAddress}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Platform Fee Split:</span>
              <span style={{ color: '#f43f5e', fontWeight: 'bold', marginLeft: '8px' }}>12.5% Treasury / 87.5% Creator</span>
            </div>
          </div>
        </div>

      </div>

      {/* Section 2: Interactive Calldata & Payload Visualizer */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#f3f4f6' }}>
          🧮 Interactive On-Chain Calldata & Fee Visualizer
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
          Inspect how transaction parameters are encoded into EVM calldata bytes and routed to the smart contract.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column: Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>Transaction Type:</label>
              <select 
                value={paymentType} 
                onChange={(e) => setPaymentType(e.target.value as any)}
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc' }}
              >
                <option value="subscription">Subscription Payment (paySubscription - 0x7158d140)</option>
                <option value="tip">Tip Creator (payTip - 0x7b6c03b7)</option>
                <option value="ppv">Unlock PPV Content (payPPV - 0xf6ad20a7)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>Creator Payout Wallet Address:</label>
              <input 
                type="text" 
                value={creatorWalletInput}
                onChange={(e) => setCreatorWalletInput(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>Payment Amount (USDC):</label>
              <input 
                type="number" 
                value={amountUsdcInput}
                onChange={(e) => setAmountUsdcInput(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc' }}
              />
            </div>

            {paymentType !== 'tip' && (
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>Related ID (Tier ID / Content ID):</label>
                <input 
                  type="text" 
                  value={relatedIdInput}
                  onChange={(e) => setRelatedIdInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>
            )}
          </div>

          {/* Right Column: Output Calldata & Fee Split */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>
                On-Chain Fee Distribution Breakdown
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8' }}>Total Payment:</span>
                <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>${amountUsdcNum.toFixed(2)} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ color: '#38bdf8' }}>Creator Share (87.5%):</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>${creatorPayout} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#f43f5e' }}>Platform Treasury Fee (12.5%):</span>
                <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>${platformFee} USDC</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>Generated Hex Calldata Payload:</label>
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', color: '#22c55e', fontSize: '12px', wordBreak: 'break-all', minHeight: '80px' }}>
                {getEncodedCalldata()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Smart Contract Function Selectors Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#f3f4f6' }}>
          📑 Contract Method Selectors Reference
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Function Signature</th>
              <th style={{ padding: '10px' }}>4-Byte Selector</th>
              <th style={{ padding: '10px' }}>Expected Event Topic0</th>
              <th style={{ padding: '10px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>paySubscription(address,address,uint256,bytes32)</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>0x7158d140</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#a855f7' }}>SubscriptionPaid</td>
              <td style={{ padding: '12px 10px', color: '#94a3b8' }}>Fan pays USDC subscription to creator</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>payTip(address,address,uint256)</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>0x7b6c03b7</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#a855f7' }}>TipPaid</td>
              <td style={{ padding: '12px 10px', color: '#94a3b8' }}>Direct USDC tip to creator</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>payPPV(address,address,uint256,bytes32)</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>0xf6ad20a7</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#a855f7' }}>PPVPaid</td>
              <td style={{ padding: '12px 10px', color: '#94a3b8' }}>Unlock pay-per-view post with USDC</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>approveRecurringSubscription(address,uint256,uint256)</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>0x1e0ff1d4</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#a855f7' }}>RecurringApproved</td>
              <td style={{ padding: '12px 10px', color: '#94a3b8' }}>Approve auto-renewal allowance</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>processPayout(address,address,uint256)</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>0x32ab19f5</td>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#a855f7' }}>PayoutProcessed</td>
              <td style={{ padding: '12px 10px', color: '#94a3b8' }}>Execute payout transfer to creator</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
