const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const turf = require('@turf/turf');

const app = express();
app.get('/', (_, res) => res.send('Man Hunt server attivo'));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const games = {};

const PRESET_MAPS = {
  roma: [
    { name: 'Villa Borghese', polygon: [[41.914, 12.485], [41.918, 12.492], [41.911, 12.498], [41.908, 12.488]] },
    { name: 'Raggio Colosseo', polygon: [[41.895, 12.485], [41.895, 12.498], [41.885, 12.498], [41.885, 12.485]] }
  ],
  londra: [
    { name: 'Buckingham Palace Gardens', polygon: [[51.503, -0.146], [51.503, -0.140], [51.498, -0.140], [51.498, -0.146]] }
  ]
};
PRESET_MAPS.rome = PRESET_MAPS.roma;
PRESET_MAPS.london = PRESET_MAPS.londra;

const DEFAULTS = {
  gameDuration: 1200, hidingTime: 60, hunterCount: 1,
  hunterRevealInterval: 60, preyRevealInterval: 60,
  captureRadius: 10, captureTime: 5, warningDistance: 50,
  capturedBecomeHunters: true, polygon: null // polygon: [[lat,lng],...]
};

const code5 = () => Math.random().toString(36).substring(2, 7).toUpperCase();
const dist = (a, b) => turf.distance(turf.point([a.lng, a.lat]), turf.point([b.lng, b.lat]), { units: 'meters' });
const hasPos = p => p.lat != null && p.lng != null;
const pub = p => ({ id: p.id, name: p.name, role: p.role });

function polyOf(game) {
  const pg = game.settings.polygon;
  if (!pg || pg.length < 3) return null;
  const ring = pg.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return turf.polygon([ring]);
}

function sendToRole(game, role, event, payload) {
  Object.values(game.players).forEach(p => { if (p.role === role) io.to(p.id).emit(event, payload); });
}

function broadcastPositions(code) {
  const game = games[code];
  if (!game) return;
  const list = Object.values(game.players).filter(p => hasPos(p) && (p.role === 'HUNTER' || p.role === 'PREY'));
  ['HUNTER', 'PREY'].forEach(role => {
    const team = list.filter(p => p.role === role).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
    sendToRole(game, role, 'positionsUpdate', { team });
  });
  // Eliminati/spettatori vedono tutti
  Object.values(game.players).filter(p => p.role === 'SPECTATOR').forEach(s =>
    io.to(s.id).emit('positionsUpdate', { team: list.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, role: p.role })) }));
}

function endGame(code, winner, reason) {
  const game = games[code];
  if (!game || game.status === 'ENDED') return;
  game.status = 'ENDED';
  clearInterval(game.loop);
  clearTimeout(game.hidingTimeout);
  Object.values(game.players).forEach(p => clearTimeout(p.outOfBoundsTimer));
  io.to(code).emit('gameEnded', { winner, reason, players: Object.values(game.players).map(pub) });
}

function checkWin(code) {
  const game = games[code];
  const alive = Object.values(game.players).filter(p => p.role === 'PREY');
  if (alive.length === 0) endGame(code, 'HUNTERS', 'Tutte le prede sono state catturate');
}

function makeHunter(code, p, captured) {
  const game = games[code];
  clearTimeout(p.outOfBoundsTimer);
  p.outOfBoundsTimer = null;
  p.role = game.settings.capturedBecomeHunters || !captured ? 'HUNTER' : 'SPECTATOR';
  io.to(code).emit('roleChanged', { id: p.id, newRole: p.role });
}

function startGameLoop(code) {
  const game = games[code];
  const s = game.settings;
  const startedAt = Date.now();
  let lastHunterReveal = 0, lastPreyReveal = 0;

  game.loop = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - startedAt) / 1000;
    const players = Object.values(game.players);
    const hunters = players.filter(p => p.role === 'HUNTER' && hasPos(p));
    const preys = players.filter(p => p.role === 'PREY');

    io.to(code).emit('timer', { remaining: Math.max(0, Math.round(s.gameDuration - elapsed)) });

    // Cattura
    preys.forEach(prey => {
      if (!hasPos(prey)) return;
      const close = hunters.some(h => dist(h, prey) <= s.captureRadius);
      prey.captureProgress = close ? (prey.captureProgress || 0) + 1 : 0;
      if (close) io.to(prey.id).emit('beingCaptured', { progress: prey.captureProgress, needed: s.captureTime });
      if (prey.captureProgress >= s.captureTime) {
        prey.captureProgress = 0;
        io.to(code).emit('preyCaptured', { id: prey.id, name: prey.name });
        makeHunter(code, prey, true);
      }
    });

    // Rivelazioni periodiche
    if (elapsed - lastHunterReveal >= s.hunterRevealInterval) {
      lastHunterReveal = elapsed;
      const pos = players.filter(p => p.role === 'PREY' && hasPos(p)).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
      sendToRole(game, 'HUNTER', 'reveal', { of: 'PREY', positions: pos });
    }
    if (elapsed - lastPreyReveal >= s.preyRevealInterval) {
      lastPreyReveal = elapsed;
      const pos = players.filter(p => p.role === 'HUNTER' && hasPos(p)).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
      sendToRole(game, 'PREY', 'reveal', { of: 'HUNTER', positions: pos });
    }

    // Prede fuori zona: posizione in tempo reale ai cacciatori
    players.filter(p => p.role === 'PREY' && p.outOfBoundsTimer && hasPos(p)).forEach(p =>
      sendToRole(game, 'HUNTER', 'preyExposed', { id: p.id, name: p.name, lat: p.lat, lng: p.lng, reason: 'OUT_OF_BOUNDS' }));

    checkWin(code);
    if (game.status !== 'ENDED' && elapsed >= s.gameDuration) endGame(code, 'PREY', 'Tempo scaduto: vincono le prede rimaste');
  }, 1000);
}

io.on('connection', socket => {
  socket.on('createRoom', ({ city, name }) => {
    let code; do { code = code5(); } while (games[code]);
    const presets = PRESET_MAPS[(city || '').toLowerCase().trim()] || [];
    games[code] = { hostId: socket.id, players: {}, status: 'LOBBY', settings: { ...DEFAULTS }, presets };
    games[code].players[socket.id] = { id: socket.id, name: name || 'Host', role: null, lat: null, lng: null };
    socket.join(code);
    socket.data.code = code;
    socket.emit('roomCreated', { code, presets, settings: games[code].settings });
    io.to(code).emit('playerListUpdate', Object.values(games[code].players).map(pub));
  });

  socket.on('joinRoom', ({ code, name }) => {
    code = (code || '').toUpperCase();
    const game = games[code];
    if (!game) return socket.emit('errorMsg', 'Stanza non trovata');
    if (game.status !== 'LOBBY') return socket.emit('errorMsg', 'Partita già iniziata');
    game.players[socket.id] = { id: socket.id, name: name || 'Giocatore', role: null, lat: null, lng: null };
    socket.join(code);
    socket.data.code = code;
    socket.emit('joined', { code, settings: game.settings, isHost: false });
    io.to(code).emit('playerListUpdate', Object.values(game.players).map(pub));
  });

  socket.on('updateSettings', ({ code, settings }) => {
    const game = games[code];
    if (!game || game.hostId !== socket.id || game.status !== 'LOBBY') return;
    const clean = {};
    Object.keys(DEFAULTS).forEach(k => { if (k in settings) clean[k] = settings[k]; });
    game.settings = { ...game.settings, ...clean };
    io.to(code).emit('settingsUpdated', game.settings);
  });

  socket.on('startGame', ({ code }) => {
    const game = games[code];
    if (!game || game.hostId !== socket.id || game.status !== 'LOBBY') return;
    const ids = Object.keys(game.players);
    if (ids.length < 2) return socket.emit('errorMsg', 'Servono almeno 2 giocatori');
    const hc = Math.min(Math.max(1, game.settings.hunterCount), ids.length - 1);
    ids.sort(() => 0.5 - Math.random()).forEach((id, i) => { game.players[id].role = i < hc ? 'HUNTER' : 'PREY'; });

    game.status = 'HIDING';
    io.to(code).emit('gameStarted', { status: 'HIDING', hidingTime: game.settings.hidingTime, settings: game.settings });
    ids.forEach(id => io.to(id).emit('yourRole', { role: game.players[id].role }));

    game.hidingTimeout = setTimeout(() => {
      game.status = 'PLAYING';
      io.to(code).emit('phaseUpdate', { status: 'PLAYING' });
      startGameLoop(code);
    }, game.settings.hidingTime * 1000);
  });

  socket.on('updatePosition', ({ code, lat, lng }) => {
    const game = games[code];
    if (!game || !['HIDING', 'PLAYING'].includes(game.status)) return;
    const player = game.players[socket.id];
    if (!player || typeof lat !== 'number' || typeof lng !== 'number') return;
    player.lat = lat; player.lng = lng;
    if (game.status !== 'PLAYING') return broadcastPositions(code);

    const poly = polyOf(game);
    if (poly && player.role === 'PREY') {
      const inside = turf.booleanPointInPolygon(turf.point([lng, lat]), poly);
      if (!inside && !player.outOfBoundsTimer) {
        socket.emit('outOfBounds', { seconds: 60 });
        player.outOfBoundsTimer = setTimeout(() => makeHunter(code, player, false), 60000);
      } else if (inside && player.outOfBoundsTimer) {
        clearTimeout(player.outOfBoundsTimer);
        player.outOfBoundsTimer = null;
        socket.emit('backInBounds');
      }
    }

    if (player.role === 'PREY') {
      const near = Object.values(game.players).some(o =>
        o.role === 'HUNTER' && hasPos(o) && dist(player, o) <= game.settings.warningDistance);
      socket.emit('proximityWarning', { danger: near, distance: game.settings.warningDistance });
    }
    broadcastPositions(code);
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    const game = games[code];
    if (!game) return;
    const p = game.players[socket.id];
    if (p) clearTimeout(p.outOfBoundsTimer);
    delete game.players[socket.id];
    if (Object.keys(game.players).length === 0) {
      clearInterval(game.loop); clearTimeout(game.hidingTimeout);
      delete games[code];
      return;
    }
    if (game.hostId === socket.id) {
      game.hostId = Object.keys(game.players)[0];
      io.to(game.hostId).emit('youAreHost');
    }
    io.to(code).emit('playerListUpdate', Object.values(game.players).map(pub));
    if (game.status === 'PLAYING') checkWin(code);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server ManHunt attivo sulla porta ${PORT}`));
