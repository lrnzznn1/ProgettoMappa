/**
 * Progetto Segretissimo - Backend Node.js/Express
 * App per cercare ristoranti in una zona usando Google Maps API
 */

// Carica variabili ambiente dal file .env
require('dotenv').config();
const express = require('express');
const path = require('path');

// Inizializza app Express
const app = express();
app.use(express.json()); // Middleware per parsare JSON nei request body

// Porta di ascolto (di default 3000)
const port = process.env.PORT || 3000;

// Chiave API Google Maps caricata da .env (obbligatoria per funzionare)
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

// ===== CONFIGURAZIONE TEMPLATE E FILE STATICI =====
// Imposta EJS come view engine per renderizzare i template HTML
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve file statici (CSS, JS, immagini) dalla cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTE PRINCIPALE =====
/**
 * GET /
 * Renderizza la pagina principale (index.ejs) e injetta la chiave API di Google Maps
 * La chiave viene passata al template e inserita nello script di caricamento Google Maps
 */
app.get('/', (req, res) => {
  res.render('index', { apiKey });
});

// ===== RICERCA RISTORANTI (ENDPOINT PRINCIPALE) =====
/**
 * POST /api/places/searchNearby
 * Ricerca ristoranti in una zona geografica usando Google Places API v1
 * Supporta nativamente includedTypes e excludedTypes
 * 
 * Body richiesta:
 *   - lat: latitudine del centro cerchio (numero)
 *   - lng: longitudine del centro cerchio (numero)
 *   - radius: raggio di ricerca in metri (numero)
 *   - includedTypes: tipi di posti (default: ['restaurant'])
 *   - excludedTypes: tipi da escludere (default: [])
 *   - maxResultCount: numero massimo di risultati (default: 20)
 * 
 * Risposta:
 *   { ok: true, data: { places: [...] } } oppure { ok: false, error: "motivo" }
 */
app.post('/api/places/searchNearby', async (req, res) => {
  try {
    console.log('\n=== 📋 RICHIESTA RICERCA RICEVUTA ===');
    console.log('Server received /api/places/searchNearby:', req.body);
    
    // Recupera la chiave API dai settings del server
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Server missing Google Maps API key' });

    // Estrae parametri dal body della richiesta
    const { lat, lng, radius, includedTypes = ['restaurant'], excludedTypes = [], maxResultCount = 20 } = req.body || {};
    
    // Valida che i parametri obbligatori siano presenti
    if (!lat || !lng || !radius) return res.status(400).json({ ok: false, error: 'lat, lng and radius are required' });
    
    // LOG DI DEBUG: Mostra coordinate effettive usate
    console.log(`✓ Coordinate ricerca: LAT=${lat}, LNG=${lng}, RADIUS=${radius}m`);
    console.log(`✓ Tipi inclusi: [${includedTypes.join(', ')}]`);
    console.log(`✓ Tipi esclusi: [${excludedTypes.join(', ')}]`);

    // Costruisce il body della richiesta per l'API v1
    const requestBody = {
      includedTypes: includedTypes.length > 0 ? includedTypes : ['restaurant'],
      excludedTypes,
      maxResultCount,
      locationRestriction: {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: Number(radius)
        }
      }
    };

    const url = `https://places.googleapis.com/v1/places:searchNearby`;
    
    // Tenta di usare fetch se disponibile (Node.js 18+)
    const fetchFn = (typeof fetch === 'function') ? fetch : null;
    
    if (fetchFn) {
      // Opzione 1: usa fetch moderna (Node.js 18+)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types,places.location,places.id'
        },
        body: JSON.stringify(requestBody)
      });
      const json = await response.json();
      return res.json({ ok: true, data: json });
    }

    // Opzione 2: fallback con https per Node.js più vecchie
    const https = require('https');
    const bodyStr = JSON.stringify(requestBody);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types,places.location,places.id',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    
    // Effettua la richiesta HTTPS e attende la risposta completa
    const result = await new Promise((resolve, reject) => {
      const reqData = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => resolve({ statusCode: resp.statusCode, body: data }));
      });
      reqData.on('error', reject);
      reqData.end();
    });
    
    // Parsa il JSON della risposta e lo rimanda al client
    const parsed = JSON.parse(result.body || '{}');
    return res.json({ ok: true, data: parsed });
    
  } catch (err) {
    // Gestisce errori (API key invalida, rete, etc.)
    console.error('Error calling Google Places API', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== ENDPOINT DI DEBUG =====
/**
 * GET /status
 * Endpoint per verificare se il server è online e se la chiave API è configurata
 * Utile per il debugging
 */
app.get('/status', (req, res) => {
  res.json({ ok: true, hasGoogleKey: !!apiKey });
});

// ===== AVVIA IL SERVER =====
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  if (!apiKey) console.warn('⚠️  GOOGLE_MAPS_API_KEY non è configurata in .env - la mappa non funzionerà');
});
