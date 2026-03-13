#!/usr/bin/env node
// ═══════════════════════════════════════════════════
// CurioCharts — Data Loader (NEW)
// Reads from Central Curio Data Hub
// No API calls needed - uses shared data!
// ═══════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_HUB = path.join(process.env.HOME, '.curio-data-hub', 'latest.json');
const OUTPUT_DIR = path.join(__dirname, 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'data.json');

console.log('🎨 ═══════════════════════════════════════════');
console.log('🎨 CurioCharts - Loading from Data Hub');
console.log('🎨 ═══════════════════════════════════════════');
console.log('');

// Ensure data hub exists and is fresh
function ensureDataHub() {
  if (!fs.existsSync(DATA_HUB)) {
    console.log('⚠️  Data hub not found - fetching fresh data...');
    try {
      execSync('~/.curio-data-hub/fetch-curio-data.sh', { 
        stdio: 'inherit',
        shell: '/bin/bash'
      });
    } catch (e) {
      console.error('❌ Failed to fetch data:', e.message);
      process.exit(1);
    }
  } else {
    // Check if data is stale (older than 24 hours)
    const stats = fs.statSync(DATA_HUB);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      console.log(`⚠️  Data is ${ageHours.toFixed(1)}h old - fetching fresh data...`);
      try {
        execSync('~/.curio-data-hub/fetch-curio-data.sh', { 
          stdio: 'inherit',
          shell: '/bin/bash'
        });
      } catch (e) {
        console.warn('⚠️  Fresh fetch failed, using stale data:', e.message);
      }
    }
  }
}

// Read from data hub
function readDataHub() {
  console.log('📊 Reading from Curio Data Hub...');
  const raw = fs.readFileSync(DATA_HUB, 'utf8');
  const data = JSON.parse(raw);
  
  console.log('✅ Data loaded:');
  console.log(`   Floor: ${data.market.floor_price} ETH`);
  console.log(`   Volume (24h): ${data.market.volume_24h} ETH`);
  console.log(`   Sales (24h): ${data.market.sales_24h}`);
  console.log(`   Holders: ${data.market.holders}`);
  console.log(`   Updated: ${data.timestamp}`);
  console.log('');
  
  return data;
}

// Transform hub data to CurioCharts format
function transformData(hubData) {
  console.log('🔄 Transforming data for CurioCharts...');
  
  // Extract collection stats
  const stats = {
    total: {
      floor_price: hubData.market.floor_price,
      floor_price_symbol: 'ETH',
      one_day_volume: hubData.market.volume_24h,
      one_day_change: 0, // Calculate from historical if available
      one_day_sales: hubData.market.sales_24h,
      one_day_average_price: hubData.market.volume_24h / Math.max(hubData.market.sales_24h, 1),
      num_owners: hubData.market.holders,
      total_supply: hubData.collection.total_supply,
      count: hubData.cards.total
    }
  };
  
  // Create CurioCharts data structure
  const output = {
    timestamp: hubData.timestamp,
    collection: {
      slug: hubData.collection.slug,
      name: hubData.collection.name,
      description: 'First art show NFTs on Ethereum, launched May 9, 2017',
      floor_price: hubData.market.floor_price,
      total_volume: hubData.market.volume_24h,
      total_sales: hubData.market.sales_24h,
      num_owners: hubData.market.holders,
      total_supply: hubData.collection.total_supply
    },
    stats: stats,
    cards: generateCardData(hubData),
    metadata: {
      source: 'Curio Data Hub',
      fetched_at: hubData.timestamp,
      data_age: calculateDataAge(hubData.timestamp)
    }
  };
  
  return output;
}

// Generate card data (mock for now, could be enhanced with individual card data)
function generateCardData(hubData) {
  const cards = [];
  const baseFloor = hubData.market.floor_price;
  
  // Generate data for 30 cards (Curio Cards have 30 unique designs)
  for (let i = 1; i <= 30; i++) {
    cards.push({
      id: i,
      name: `Curio Card ${i}`,
      floor_price: baseFloor * (0.8 + Math.random() * 0.4), // Vary prices ±20%
      total_supply: hubData.collection.total_supply,
      // Could add more fields if we fetch individual card data
    });
  }
  
  return cards;
}

// Calculate how old the data is
function calculateDataAge(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 1000 / 60);
  
  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffMins < 1440) {
    return `${Math.floor(diffMins / 60)} hours ago`;
  } else {
    return `${Math.floor(diffMins / 1440)} days ago`;
  }
}

// Save output
function saveData(data) {
  console.log('💾 Saving data for CurioCharts...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write formatted JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`✅ Saved to: ${OUTPUT_FILE} (${sizeKB} KB)`);
}

// Main execution
async function main() {
  try {
    // Step 1: Ensure data hub is available and fresh
    ensureDataHub();
    
    // Step 2: Read from data hub
    const hubData = readDataHub();
    
    // Step 3: Transform to CurioCharts format
    const chartsData = transformData(hubData);
    
    // Step 4: Save output
    saveData(chartsData);
    
    console.log('');
    console.log('🎨 ═══════════════════════════════════════════');
    console.log('✅ CurioCharts data updated from Data Hub!');
    console.log('🎨 ═══════════════════════════════════════════');
    console.log('');
    console.log('📊 Data Summary:');
    console.log(`   Floor: ${chartsData.collection.floor_price} ETH`);
    console.log(`   24h Volume: ${chartsData.collection.total_volume} ETH`);
    console.log(`   24h Sales: ${chartsData.collection.total_sales}`);
    console.log(`   Holders: ${chartsData.collection.num_owners}`);
    console.log(`   Cards: ${chartsData.cards.length}`);
    console.log('');
    console.log('🔄 Using shared data from: ~/.curio-data-hub/latest.json');
    console.log('⚡ No API calls needed - instant update!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();
