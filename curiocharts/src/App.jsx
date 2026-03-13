
  // ═══ Main Market View ═══
  return (
    <div style={{minHeight:"100vh",background:"#0a0a14",color:"#e0e0e8",fontFamily:"'JetBrains Mono','SF Mono',monospace"}}>
      {/* Header */}
      <header style={{padding:"12px 20px",borderBottom:"1px solid #1e1e30",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>📊</span>
          <h1 style={{fontSize:18,margin:0,fontWeight:700}}>Curio<span style={{color:"#4ade80"}}>Charts</span></h1>
          <span style={{fontSize:10,color:"#555",maxWidth:200}}>First Art NFTs on Ethereum · On-Chain Data</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {showApiInput && (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="OpenSea API Key" type="password"
                style={{background:"#12121e",border:"1px solid #333",borderRadius:6,padding:"5px 10px",color:"#aaa",fontSize:11,width:200}} autoFocus />
              <button onClick={() => { setShowApiInput(false); if (apiKey) fetchAllData(); }}
                style={{background:"#1a3a1a",color:"#4ade80",border:"1px solid #2a4a2a",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11}}>Save</button>
              <a href="https://docs.opensea.io/reference/api-keys" target="_blank" rel="noopener noreferrer" style={{color:"#60a5fa",fontSize:10,textDecoration:"none"}}>Get key ↗</a>
            </div>
          )}
          {!showApiInput && (
            <>
              {apiKey ? (
                <span style={{fontSize:10,color:"#4ade80",cursor:"pointer"}} onClick={() => setShowApiInput(true)}>🔑 API Key Set</span>
              ) : (
                <button onClick={() => setShowApiInput(true)} style={{background:"#1a1a2e",color:"#888",border:"1px solid #333",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11}}>🔑 Set API Key</button>
              )}
              <button onClick={fetchAllData} disabled={loading}
                style={{background: loading ? "#333" : "#1a3a1a",color: loading ? "#666" : "#4ade80",border:"1px solid #2a4a2a",borderRadius:6,padding:"5px 14px",cursor: loading ? "default" : "pointer",fontSize:11,fontWeight:600}}>
                {loading ? "⏳ Fetching..." : "🔄 Update Data"}
              </button>
            </>
          )}
          {lastUpdate && <span style={{fontSize:10,color:"#555"}}>Updated {new Date(lastUpdate).toLocaleString()}</span>}
        </div>
      </header>

      {/* Fetch Progress */}
      {loading && fetchProgress.total > 0 && (
        <div style={{padding:"8px 20px 0"}}><FetchProgress current={fetchProgress.current} total={fetchProgress.total} cardName={fetchProgress.cardName} /></div>
      )}

      {/* Stats Bar */}
      <div style={{padding:"10px 20px",borderBottom:"1px solid #1a1a2e",display:"flex",gap:24,flexWrap:"wrap",fontSize:12}}>
        <span><span style={{color:"#666"}}>Market Cap:</span> <span style={{color:"#4ade80",fontWeight:600}}>Ξ{totalMcap.toFixed(2)}</span></span>
        <span><span style={{color:"#666"}}>24h Vol:</span> <span style={{color:"#60a5fa",fontWeight:600}}>Ξ{totalVol.toFixed(4)}</span></span>
        <span><span style={{color:"#666"}}>Cards:</span> <span style={{color:"#fff"}}>{CURIO_CARDS.length}</span></span>
        {realDataCount > 0 && <span><span style={{color:"#666"}}>Live Data:</span> <span style={{color:"#4ade80"}}>{realDataCount}/{CURIO_CARDS.length}</span></span>}
        <span style={{color:"#555",fontSize:10}}>
          Data: {dataSource === "live" ? "🟢 OpenSea Live" : dataSource === "cached" ? "🟡 Cached" : dataSource === "static" ? "🔵 Pre-fetched" : "⚪ Placeholder"}
        </span>
        <span><span style={{color:"#666"}}>Contract:</span> <a href={`https://etherscan.io/address/${CONTRACT}`} target="_blank" rel="noopener noreferrer" style={{color:"#60a5fa",textDecoration:"none",fontSize:11}}>{CONTRACT.slice(0,8)}…{CONTRACT.slice(-6)}</a></span>
      </div>

      {/* Tabs */}
      <div style={{padding:"0 20px",borderBottom:"1px solid #1a1a2e",display:"flex",gap:0}}>
        {[["market","📈 Market"],["trending","🔥 All Cards"],["analytics","📊 Analytics"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{background:"transparent",color: tab===t ? "#4ade80" : "#666",border:"none",borderBottom: tab===t ? "2px solid #4ade80" : "2px solid transparent",padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight: tab===t ? 600 : 400}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"16px 20px"}}>
