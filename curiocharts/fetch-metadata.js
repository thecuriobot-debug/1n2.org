#!/usr/bin/env node
// ═══════════════════════════════════════════════════
// CurioCharts — On-Chain Metadata Fetcher
// Reads tokenURI from the wrapper contract via public RPC
// then fetches IPFS metadata for all 31 Curio Cards
// No API key needed — uses on-chain data + IPFS
// ═══════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT = '0x73da73ef3a6982109c4d5bdb0db9dd3e3783f313';
const RPC_URL = 'https://eth.llamarpc.com';
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const OUTPUT = path.join(__dirname, 'public', 'card-metadata.json');
const DELAY_MS = 500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Token IDs: 1-30 + 172 (which is the 17b misprint)
const TOKEN_IDS = [...Array.from({length: 30}, (_, i) => i + 1), 172];

// Call uri(uint256) on the ERC-1155 contract - function sig 0x0e89341c
async function getTokenURI(tokenId) {
  const idHex = tokenId.toString(16).padStart(64, '0');
  const data = `0x0e89341c${idHex}`;
  
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: CONTRACT, data }, 'latest'],
      id: 1,
    }),
  });
  
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  
  // ABI decode string: skip offset (32 bytes) + length (32 bytes), read the string
  const hex = json.result.slice(2); // remove 0x
  const offset = parseInt(hex.slice(0, 64), 16) * 2;
  const length = parseInt(hex.slice(offset, offset + 64), 16);
  const strHex = hex.slice(offset + 64, offset + 64 + length * 2);
  
  let uri = '';
  for (let i = 0; i < strHex.length; i += 2) {
    uri += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16));
  }
  return uri;
}

// Fetch IPFS JSON metadata
async function fetchIPFSMetadata(ipfsUri) {
  const cid = ipfsUri.replace('ipfs://', '');
  const url = `${IPFS_GATEWAY}${cid}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  return await res.json();
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  CurioCharts — On-Chain Metadata Fetcher');
  console.log('═══════════════════════════════════════════\n');
  
  const cards = {};
  let success = 0;
  
  for (const tokenId of TOKEN_IDS) {
    const cardId = tokenId === 172 ? '17b' : String(tokenId);
    process.stdout.write(`  Card #${cardId.padEnd(4)} `);
    
    try {
      // Step 1: Get on-chain URI
      const uri = await getTokenURI(tokenId);
      process.stdout.write(`URI: ${uri.slice(0, 40)}... `);
      
      await sleep(DELAY_MS);
      
      // Step 2: Fetch IPFS metadata
      const meta = await fetchIPFSMetadata(uri);
      
      // Extract image CID from ipfs:// URI
      const imageCID = meta.image ? meta.image.replace('ipfs://', '') : '';
      
      cards[cardId] = {
        id: cardId,
        tokenId,
        name: meta.name || `Card #${cardId}`,
        description: meta.description || '',
        image_ipfs: meta.image || '',
        image_cid: imageCID,
        image_url: imageCID ? `${IPFS_GATEWAY}${imageCID}` : '',
        symbol: meta.properties?.symbol || `CRO${cardId}`,
        artist: meta.properties?.artist || 'Unknown',
        artist_url: meta.properties?.artist_url || '',
        erc20: meta.properties?.erc20 || '',
        metadata_uri: uri,
      };
      
      console.log(`✅ "${meta.name}" by ${meta.properties?.artist || '?'}`);
      success++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    
    await sleep(300);
  }
  
  const output = {
    fetched_at: new Date().toISOString(),
    contract: CONTRACT,
    total_cards: success,
    cards,
  };
  
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${success}/${TOKEN_IDS.length} cards to ${OUTPUT}`);
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
