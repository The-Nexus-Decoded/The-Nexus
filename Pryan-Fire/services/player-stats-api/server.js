const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, 'data', 'player_stats.json');

// Load player data
function loadPlayerData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading player data:', err.message);
    return { players: {} };
  }
}

// GET /api/player/:player_id - Get specific player stats
app.get('/api/player/:player_id', (req, res) => {
  const { player_id } = req.params;
  const data = loadPlayerData();
  
  if (data.players[player_id]) {
    res.json(data.players[player_id]);
  } else {
    res.status(404).json({ 
      error: 'Player not found',
      player_id: player_id
    });
  }
});

// GET /api/players - Get all players (optional listing endpoint)
app.get('/api/players', (req, res) => {
  const data = loadPlayerData();
  const playerList = Object.values(data.players).map(p => ({
    player_id: p.player_id,
    name: p.name,
    race: p.race,
    class: p.class,
    level: p.level
  }));
  res.json({ players: playerList });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Player Stats API running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /api/player/:player_id - Get player stats`);
  console.log(`  GET /api/players - List all players`);
  console.log(`  GET /health - Health check`);
});
