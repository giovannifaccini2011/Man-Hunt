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

// Città: "Nome|Alias,lat,lng" (centro approssimativo). Aggiungi righe per nuove città.
const CITY_DATA = `Torino|Turin,45.0703,7.6869
Alessandria,44.9133,8.6150
Asti,44.9000,8.2064
Biella,45.5628,8.0583
Cuneo,44.3845,7.5427
Novara,45.4469,8.6220
Verbania,45.9214,8.5519
Vercelli,45.3203,8.4185
Aosta,45.7370,7.3206
Milano|Milan,45.4642,9.1900
Bergamo,45.6983,9.6773
Brescia,45.5416,10.2118
Como,45.8081,9.0852
Cremona,45.1337,10.0422
Lecco,45.8566,9.3977
Lodi,45.3141,9.5037
Mantova,45.1564,10.7914
Monza,45.5845,9.2744
Pavia,45.1847,9.1582
Sondrio,46.1699,9.8786
Varese,45.8206,8.8251
Trento,46.0748,11.1217
Bolzano,46.4983,11.3548
Venezia|Venice,45.4408,12.3155
Belluno,46.1397,12.2167
Padova,45.4064,11.8768
Rovigo,45.0703,11.7900
Treviso,45.6669,12.2430
Verona,45.4384,10.9916
Vicenza,45.5455,11.5354
Trieste,45.6495,13.7768
Gorizia,45.9411,13.6220
Pordenone,45.9564,12.6609
Udine,46.0711,13.2346
Genova|Genoa,44.4056,8.9463
Imperia,43.8897,8.0399
La Spezia,44.1025,9.8241
Savona,44.3091,8.4772
Bologna,44.4949,11.3426
Ferrara,44.8381,11.6198
Forlì,44.2227,12.0407
Cesena,44.1391,12.2431
Modena,44.6471,10.9252
Parma,44.8015,10.3279
Piacenza,45.0526,9.6930
Ravenna,44.4184,12.2035
Reggio Emilia,44.6989,10.6297
Rimini,44.0678,12.5695
Firenze|Florence,43.7696,11.2558
Arezzo,43.4631,11.8781
Grosseto,42.7635,11.1124
Livorno,43.5485,10.3106
Lucca,43.8430,10.5027
Massa,44.0354,10.1394
Carrara,44.0793,10.0979
Pisa,43.7228,10.4017
Pistoia,43.9336,10.9170
Prato,43.8777,11.1023
Siena,43.3188,11.3308
Perugia,43.1107,12.3908
Terni,42.5636,12.6427
Ancona,43.6158,13.5189
Ascoli Piceno,42.8540,13.5749
Fermo,43.1600,13.7189
Macerata,43.3000,13.4531
Pesaro,43.9100,12.9133
Urbino,43.7262,12.6366
Roma|Rome,41.9028,12.4964
Frosinone,41.6400,13.3400
Latina,41.4676,12.9037
Rieti,42.4048,12.8624
Viterbo,42.4207,12.1077
L'Aquila,42.3498,13.3995
Chieti,42.3512,14.1675
Pescara,42.4618,14.2161
Teramo,42.6589,13.7040
Campobasso,41.5603,14.6627
Isernia,41.5930,14.2330
Napoli|Naples,40.8518,14.2681
Avellino,40.9146,14.7906
Benevento,41.1298,14.7826
Caserta,41.0732,14.3330
Salerno,40.6824,14.7681
Bari,41.1171,16.8719
Andria,41.2310,16.2970
Barletta,41.3190,16.2810
Trani,41.2767,16.4150
Brindisi,40.6327,17.9418
Foggia,41.4622,15.5446
Lecce,40.3516,18.1718
Taranto,40.4644,17.2470
Potenza,40.6404,15.8056
Matera,40.6663,16.6043
Catanzaro,38.9098,16.5877
Cosenza,39.2983,16.2540
Crotone,39.0808,17.1271
Reggio Calabria|Reggio di Calabria,38.1113,15.6619
Vibo Valentia,38.6760,16.1000
Palermo,38.1157,13.3615
Agrigento,37.3111,13.5766
Caltanissetta,37.4901,14.0629
Catania,37.5079,15.0830
Enna,37.5670,14.2750
Messina,38.1938,15.5540
Ragusa,36.9269,14.7255
Siracusa|Syracuse,37.0755,15.2866
Trapani,38.0176,12.5365
Cagliari,39.2238,9.1217
Sassari,40.7259,8.5556
Nuoro,40.3210,9.3300
Oristano,39.9062,8.5886
Olbia,40.9235,9.4960
Carbonia,39.1670,8.5220
Sanluri,39.5589,8.9072
Lanusei,39.8786,9.5403
New York,40.7128,-74.0060
Los Angeles,34.0522,-118.2437
Chicago,41.8781,-87.6298
Houston,29.7604,-95.3698
Miami,25.7617,-80.1918
San Francisco,37.7749,-122.4194
Washington,38.9072,-77.0369
Boston,42.3601,-71.0589
Seattle,47.6062,-122.3321
Toronto,43.6532,-79.3832
Vancouver,49.2827,-123.1207
Montréal|Montreal,45.5017,-73.5673
Città del Messico|Mexico City,19.4326,-99.1332
San Paolo|Sao Paulo,-23.5505,-46.6333
Rio de Janeiro,-22.9068,-43.1729
Buenos Aires,-34.6037,-58.3816
Santiago,-33.4489,-70.6693
Lima,-12.0464,-77.0428
Bogotà|Bogota,4.7110,-74.0721
Londra|London,51.5074,-0.1278
Parigi|Paris,48.8566,2.3522
Lione|Lyon,45.7640,4.8357
Marsiglia|Marseille,43.2965,5.3698
Nizza|Nice,43.7102,7.2620
Berlino|Berlin,52.5200,13.4050
Madrid,40.4168,-3.7038
Barcellona|Barcelona,41.3874,2.1686
Lisbona|Lisbon,38.7223,-9.1393
Amsterdam,52.3676,4.9041
Bruxelles|Brussels,50.8503,4.3517
Vienna,48.2082,16.3738
Zurigo|Zurich,47.3769,8.5417
Monaco di Baviera|Munich,48.1351,11.5820
Francoforte|Frankfurt,50.1109,8.6821
Amburgo|Hamburg,53.5511,9.9937
Praga|Prague,50.0755,14.4378
Varsavia|Warsaw,52.2297,21.0122
Budapest,47.4979,19.0402
Copenaghen|Copenhagen,55.6761,12.5683
Stoccolma|Stockholm,59.3293,18.0686
Oslo,59.9139,10.7522
Helsinki,60.1699,24.9384
Dublino|Dublin,53.3498,-6.2603
Edimburgo|Edinburgh,55.9533,-3.1883
Atene|Athens,37.9838,23.7275
Istanbul,41.0082,28.9784
Mosca|Moscow,55.7558,37.6173
Kyiv|Kiev,50.4501,30.5234
Bucarest|Bucharest,44.4268,26.1025
Belgrado|Belgrade,44.7866,20.4489
Zagabria|Zagreb,45.8150,15.9819
Lubiana|Ljubljana,46.0569,14.5058
Il Cairo|Cairo,30.0444,31.2357
Casablanca,33.5731,-7.5898
Lagos,6.5244,3.3792
Nairobi,-1.2921,36.8219
Johannesburg,-26.2041,28.0473
Città del Capo|Cape Town,-33.9249,18.4241
Dubai,25.2048,55.2708
Tel Aviv,32.0853,34.7818
Teheran|Tehran,35.6892,51.3890
Mumbai,19.0760,72.8777
Delhi|New Delhi,28.6139,77.2090
Bangkok,13.7563,100.5018
Singapore,1.3521,103.8198
Hong Kong,22.3193,114.1694
Shanghai,31.2304,121.4737
Pechino|Beijing,39.9042,116.4074
Tokyo,35.6762,139.6503
Osaka,34.6937,135.5023
Seul|Seoul,37.5665,126.9780
Giacarta|Jakarta,-6.2088,106.8456
Manila,14.5995,120.9842
Sydney,-33.8688,151.2093
Melbourne,-37.8136,144.9631
Auckland,-36.8509,174.7645`;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const CITIES = {};
CITY_DATA.trim().split('\n').forEach(l => {
  const [names, lat, lng] = l.split(',');
  names.split('|').forEach(n => { CITIES[norm(n)] = { label: names.split('|')[0], lat: +lat, lng: +lng }; });
});
const CITY_LABELS = [...new Set(Object.values(CITIES).map(c => c.label))].sort();
function ringPolygon(c, r) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    pts.push([+(c.lat + r * Math.cos(a) / 111320).toFixed(6), +(c.lng + r * Math.sin(a) / (111320 * Math.cos(c.lat * Math.PI / 180))).toFixed(6)]);
  }
  return pts;
}
function ringPresets(c, n) {
  return [400, 900, 1500, 250, 600].slice(0, n).map(r => ({ name: `${c.label} - centro ${r} m`, polygon: ringPolygon(c, r) }));
}
function presetsFor(city) {
  const key = norm(city), c = CITIES[key];
  return [...(PRESET_MAPS[key] || []), ...(c ? ringPresets(c, 5) : [])];
}

// ---- Luoghi reali da OpenStreetMap: parchi, giardini, castelli, siti archeologici, zoo ----
const OSM_CACHE = {};
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
async function fetchJson(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: ctrl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function geocode(q) {
  const j = await fetchJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q),
    { headers: { 'User-Agent': 'manhunt-game/1.0' } }, 8000);
  return j[0] ? { label: j[0].display_name.split(',')[0], lat: +j[0].lat, lng: +j[0].lon } : null;
}
function chainRing(ways) {
  const segs = ways.map(w => w.slice());
  let ring = segs.shift();
  while (segs.length && !same(ring[0], ring[ring.length - 1])) {
    const end = ring[ring.length - 1];
    const i = segs.findIndex(x => same(x[0], end) || same(x[x.length - 1], end));
    if (i < 0) return null;
    let seg = segs.splice(i, 1)[0];
    if (!same(seg[0], end)) seg = seg.reverse();
    ring = ring.concat(seg.slice(1));
  }
  return same(ring[0], ring[ring.length - 1]) ? ring : null;
}
async function osmPlaces(c) {
  const key = c.lat.toFixed(2) + ',' + c.lng.toFixed(2);
  if (OSM_CACHE[key]) return OSM_CACHE[key];
  const ar = `(around:3500,${c.lat},${c.lng})`;
  const q = `[out:json][timeout:20];(
    way["leisure"~"^(park|garden|nature_reserve)$"]["name"]${ar};
    relation["leisure"~"^(park|garden|nature_reserve)$"]["name"]${ar};
    way["historic"~"^(castle|fort|archaeological_site)$"]["name"]${ar};
    relation["historic"~"^(castle|fort|archaeological_site)$"]["name"]${ar};
    way["tourism"="zoo"]["name"]${ar};
  );out geom tags;`;
  let data = null;
  for (const url of OVERPASS) {
    try {
      data = await fetchJson(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 20000);
      break;
    } catch (e) { console.log('Overpass:', e.message); }
  }
  if (!data) return [];
  const out = [], seen = new Set();
  for (const el of data.elements || []) {
    const t = el.tags || {}, name = t['name:it'] || t['name:en'] || t.name;
    if (!name || seen.has(name)) continue;
    let ring = null;
    if (el.type === 'way' && el.geometry) {
      const g = el.geometry.map(p => [p.lon, p.lat]);
      if (g.length > 3 && same(g[0], g[g.length - 1])) ring = g;
    } else if (el.type === 'relation') {
      const ws = (el.members || []).filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).map(m => m.geometry.map(p => [p.lon, p.lat]));
      if (ws.length) ring = chainRing(ws);
    }
    if (!ring || ring.length < 4) continue;
    try {
      let poly = turf.polygon([ring]);
      const ha = turf.area(poly) / 10000;
      if (ha < 2 || ha > 400) continue;
      poly = turf.simplify(poly, { tolerance: 0.00005, highQuality: false });
      const pts = poly.geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => [+lat.toFixed(6), +lng.toFixed(6)]);
      if (pts.length < 3) continue;
      out.push({ name, ha, polygon: pts });
      seen.add(name);
    } catch (e) { /* poligono non valido: salto */ }
  }
  out.sort((a, b) => b.ha - a.ha);
  const res = out.slice(0, 5).map(p => ({ name: `${p.name} (${Math.round(p.ha)} ha)`, polygon: p.polygon }));
  if (res.length) OSM_CACHE[key] = res;
  return res;
}
async function loadRealPlaces(socket, code, city) {
  if (!city || !city.trim()) return;
  try {
    const key = norm(city);
    const place = CITIES[key] || await geocode(city);
    if (!place) return socket.emit('presetsUpdate', { presets: null, note: 'Città non trovata: disegna la zona sulla mappa.' });
    const real = await osmPlaces(place);
    const g = games[code];
    if (!g || g.status !== 'LOBBY') return;
    g.presets = [...(PRESET_MAPS[key] || []), ...real, ...ringPresets(place, Math.max(2, 5 - real.length))];
    socket.emit('presetsUpdate', { presets: g.presets, note: real.length ? '' : 'Nessun luogo trovato su OpenStreetMap: ti propongo zone attorno al centro.' });
  } catch (e) {
    console.log('loadRealPlaces:', e.message);
    socket.emit('presetsUpdate', { presets: null, note: 'Non sono riuscito a cercare i luoghi: usa le zone attorno al centro o disegna la tua.' });
  }
}

const DEFAULTS = {
  gameDuration: 1200, hidingTime: 60, hunterCount: 1,
  hunterRevealInterval: 60, preyRevealInterval: 60,
  captureRadius: 10, captureTime: 5, warningDistance: 50,
  capturedBecomeHunters: true, poiSpawnInterval: 120, poiDuration: 90, poiRadius: 30, poiTime: 30,
  radarNearTime: 600, radarNearRadius: 300, radarAllTime: 300, stealthCharges: 3, polygon: null // polygon: [[lat,lng],...]
};

const code5 = () => Math.random().toString(36).substring(2, 7).toUpperCase();
const dist = (a, b) => turf.distance(turf.point([a.lng, a.lat]), turf.point([b.lng, b.lat]), { units: 'meters' });
const hasPos = p => p.lat != null && p.lng != null;
const pub = p => ({ id: p.id, name: p.name, role: p.role, score: p.score || 0 });
// Le scelte manuali dei ruoli (pref) le vede solo l'host, per non rivelare chi è cacciatore
function sendPlayers(code) {
  const g = games[code];
  if (!g) return;
  const list = Object.values(g.players);
  list.forEach(p => io.to(p.id).emit('playerListUpdate',
    list.map(q => p.id === g.hostId ? { ...pub(q), pref: q.pref || null } : pub(q))));
}

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

function makePoi(game) {
  const s = game.settings, poly = polyOf(game);
  if (!poly) return null;
  const [minX, minY, maxX, maxY] = turf.bbox(poly);
  for (let i = 0; i < 300; i++) {
    const lng = minX + Math.random() * (maxX - minX), lat = minY + Math.random() * (maxY - minY);
    if (turf.booleanPointInPolygon(turf.point([lng, lat]), poly)) return { lat, lng, radius: s.poiRadius };
  }
  return null;
}
function consumeStealth(p) { if (p.stealth > 0) { p.stealth--; return true; } return false; }
function grantPower(p, s, nowMs) {
  const type = ['near', 'all', 'stealth'][Math.floor(Math.random() * 3)];
  let text;
  if (type === 'near') { p.radarNearUntil = nowMs + s.radarNearTime * 1000; text = `Radar: vedi i cacciatori entro ${s.radarNearRadius} m per ${Math.round(s.radarNearTime / 60)} minuti`; }
  else if (type === 'all') { p.radarAllUntil = nowMs + s.radarAllTime * 1000; text = `Radar globale: vedi tutti i cacciatori per ${Math.round(s.radarAllTime / 60)} minuti`; }
  else { p.stealth = (p.stealth || 0) + s.stealthCharges; text = `Invisibilità: non verrai rivelato ai cacciatori per ${s.stealthCharges} volte`; }
  io.to(p.id).emit('powerGained', { type, text });
}

function startGameLoop(code) {
  const game = games[code];
  const s = game.settings;
  const startedAt = Date.now();
  let lastHunterReveal = 0, lastPreyReveal = 0;
  game.poi = null;
  let nextSpawn = s.poiSpawnInterval;

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
      const pos = players.filter(p => p.role === 'PREY' && hasPos(p) && !consumeStealth(p)).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
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

    // Zona di rivelazione (una alla volta) e poteri delle prede
    const nowMs = Date.now();
    if (game.poi && nowMs >= game.poi.until) { game.poi = null; io.to(code).emit('poiUpdate', { poi: null }); }
    if (!game.poi && s.poiSpawnInterval > 0 && elapsed >= nextSpawn) {
      const z = makePoi(game);
      nextSpawn = elapsed + s.poiSpawnInterval;
      if (z) { game.poi = { ...z, until: nowMs + s.poiDuration * 1000 }; io.to(code).emit('poiUpdate', { poi: z }); }
    }
    const exposed = [];
    players.forEach(p => {
      if (p.role !== 'PREY' || !hasPos(p)) return;
      const z = game.poi;
      if (z && dist(z, p) <= z.radius) {
        if (!p.inPoi) { p.inPoi = true; p.poiSec = 0; p.poiAwarded = false; p.poiHidden = false; }
        p.poiSec++;
        if (!p.poiAwarded && p.poiSec >= s.poiTime) { p.poiAwarded = true; grantPower(p, s, nowMs); }
        if (!p.poiHidden && p.stealth > 0) { p.stealth--; p.poiHidden = true; }
        if (!p.poiHidden) exposed.push({ id: p.id, name: p.name, lat: p.lat, lng: p.lng });
        io.to(p.id).emit('poiProgress', { sec: p.poiAwarded ? 0 : p.poiSec, need: s.poiTime });
      } else if (p.inPoi) {
        p.inPoi = false; p.poiSec = 0;
        io.to(p.id).emit('poiProgress', { sec: 0, need: s.poiTime });
      }
      const all = (p.radarAllUntil || 0) > nowMs, near = (p.radarNearUntil || 0) > nowMs;
      if (all || near) {
        const hs = hunters.filter(h => all || dist(h, p) <= s.radarNearRadius).map(h => ({ id: h.id, lat: h.lat, lng: h.lng }));
        io.to(p.id).emit('radar', { positions: hs });
      } else if (p.radarOn) io.to(p.id).emit('radar', { positions: [] });
      p.radarOn = all || near;
      if (p.radarOn || p.stealth > 0 || p.hadPower) {
        p.hadPower = p.radarOn || p.stealth > 0;
        const left = u => Math.max(0, Math.round(((u || 0) - nowMs) / 1000));
        io.to(p.id).emit('powerState', { near: left(p.radarNearUntil), all: left(p.radarAllUntil), stealth: p.stealth || 0 });
      }
    });
    sendToRole(game, 'HUNTER', 'poiReveal', { positions: exposed });

    checkWin(code);
    if (game.status !== 'ENDED' && elapsed >= s.gameDuration) endGame(code, 'PREY', 'Tempo scaduto: vincono le prede rimaste');
  }, 1000);
}

io.on('connection', socket => {
  socket.emit('cityList', CITY_LABELS);
  socket.on('createRoom', ({ city, name }) => {
    let code; do { code = code5(); } while (games[code]);
    const presets = presetsFor(city);
    games[code] = { hostId: socket.id, players: {}, status: 'LOBBY', settings: { ...DEFAULTS }, presets };
    games[code].players[socket.id] = { id: socket.id, name: name || 'Host', role: null, lat: null, lng: null };
    socket.join(code);
    socket.data.code = code;
    socket.emit('roomCreated', { code, presets, settings: games[code].settings });
    loadRealPlaces(socket, code, city);
    sendPlayers(code);
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
    sendPlayers(code);
  });

  socket.on('updateSettings', ({ code, settings }) => {
    const game = games[code];
    if (!game || game.hostId !== socket.id || game.status !== 'LOBBY') return;
    const clean = {};
    Object.keys(DEFAULTS).forEach(k => { if (k in settings) clean[k] = settings[k]; });
    game.settings = { ...game.settings, ...clean };
    io.to(code).emit('settingsUpdated', game.settings);
  });

  socket.on('setRole', ({ code, playerId, role }) => {
    const game = games[code];
    if (!game || game.hostId !== socket.id || game.status !== 'LOBBY') return;
    const pref = role === 'HUNTER' || role === 'PREY' ? role : null;
    if (playerId === '*') Object.values(game.players).forEach(p => { p.pref = null; });
    else if (game.players[playerId]) game.players[playerId].pref = pref;
    else return;
    sendPlayers(code);
  });

  socket.on('startGame', ({ code }) => {
    const game = games[code];
    if (!game || game.hostId !== socket.id || game.status !== 'LOBBY') return;
    const ids = Object.keys(game.players);
    if (ids.length < 2) return socket.emit('errorMsg', 'Servono almeno 2 giocatori');
    // Ruoli scelti dall'host + casuali per gli altri (i cacciatori mancanti rispetto a "N° cacciatori")
    const P = Object.values(game.players);
    const fixedH = P.filter(p => p.pref === 'HUNTER'), fixedP = P.filter(p => p.pref === 'PREY');
    const free = P.filter(p => !p.pref).sort(() => 0.5 - Math.random());
    const target = Math.min(Math.max(1, game.settings.hunterCount), ids.length - 1);
    const needH = Math.min(free.length, Math.max(0, target - fixedH.length));
    const hunters = [...fixedH, ...free.slice(0, needH)], preys = [...fixedP, ...free.slice(needH)];
    if (!hunters.length) return socket.emit('errorMsg', 'Serve almeno un cacciatore');
    if (!preys.length) return socket.emit('errorMsg', 'Serve almeno una preda');
    hunters.forEach(p => { p.role = 'HUNTER'; });
    preys.forEach(p => { p.role = 'PREY'; });

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
    sendPlayers(code);
    if (game.status === 'PLAYING') checkWin(code);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server ManHunt attivo sulla porta ${PORT}`));
