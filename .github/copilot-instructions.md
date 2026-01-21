# Copilot Instructions - Progetto Segretissimo

## 🎯 Panoramica Progetto
App web per cercare e visualizzare ristoranti in una zona geografica usando **Google Maps**.

**Flusso principale:**
1. Utente disegna un cerchio sulla mappa
2. Frontend invia centro + raggio al backend via POST
3. Backend interroga Google Places API
4. Risultati visualizzati come marker sulla mappa e lista nella sidebar
5. Utente può esportare i dati come JSON

## 🛠 Stack Tecnologico
- **Backend**: Node.js 14+ + Express 4.18+
- **Frontend**: EJS (template engine) + Vanilla JavaScript (NO frameworks)
- **API Esterna**: Google Maps JavaScript API (Drawing + Places libraries)
- **Utilities**: dotenv (variabili ambiente)
- **Deployment**: `npm start` → server in ascolto su porta 3000 (default)

## 📂 Architettura

### Backend (`server.js`)
**Responsabilità:**
- Renderizzare template EJS con API key iniettata
- Fungere da proxy per Google Places API (evita limiti lato client)
- Validare e normalizzare richieste

**Route principali:**
- `GET /` → Renderizza index.ejs con `apiKey` context
- `POST /api/places/searchNearby` → Ricerca ristoranti (vedi spec sotto)
- `GET /status` → Debug endpoint: verifica se API key è configurata

**POST /api/places/searchNearby - Spec**
```json
// Request body
{
  "lat": 41.9028,           // numero, obbligatorio
  "lng": 12.4964,           // numero, obbligatorio
  "radius": 1000,           // numero in metri, obbligatorio
  "includedTypes": ["restaurant"],  // array, default: ['restaurant']
  "maxResultCount": 20      // numero, default: 20
}

// Response (success)
{
  "ok": true,
  "data": {
    "results": [
      {
        "name": "Ristorante Esempio",
        "vicinity": "Via Roma 123, Roma",
        "place_id": "ChIJH_...",
        "geometry": { "location": { "lat": 41.9..., "lng": 12.4... } },
        "rating": 4.5
      },
      // ...
    ]
  }
}

// Response (error)
{ "ok": false, "error": "lat, lng and radius are required" }
```

**Implementazione HTTP:**
- Usa `fetch()` se disponibile (Node.js 18+), altrimenti fallback con `https` module
- URL: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=LAT,LNG&radius=R&type=restaurant&key=KEY`

### Frontend (`public/js/map.js`)
**Responsabilità:**
- Inizializzare Google Maps centrata su Roma (41.9028, 12.4964)
- Fornire strumento di disegno cerchi (DrawingManager)
- Comunicare con server per ricerca ristoranti
- Gestire visualizzazione marker e lista interattiva

**Funzione principale:**
- `initMap()` → Punto di ingresso, eseguita al caricamento Google Maps API
  - Crea mappa Google Maps
  - Imposta DrawingManager per disegnare cerchi
  - Registra event listener per cerchio completato/modificato
  - Collega bottoni (Rimuovi cerchio, Esporta JSON, Ricarica)

**Funzioni critiche:**
- `searchPlaces(circle)` → Invia richiesta POST a `/api/places/searchNearby`, processa risultati
- `addPlaceMarker(place)` → Crea marker sulla mappa + listener per infoWindow
- `addPlaceToList(place, marker)` → Aggiunge voce HTML nella sidebar
- `updateCircleInfo(circle)` → Aggiorna coordinate e raggio nella sidebar
- `escapeHtml(unsafe)` → **CRITICO per sicurezza XSS**: sanitizza HTML prima di injettare nel DOM

**Gestione errori:**
- Callbacks globali: `window.mapLoadError()`, `window.gm_authFailure()`
- Timeout 4s: se Google Maps non carica, mostra overlay di errore
- Overlay di errore in `#map-overlay` (definito in index.ejs)

### Template (`views/index.ejs`)
**Struttura:**
- Meta tag: charset UTF-8, viewport mobile-responsive
- Layout CSS: flexbox con sidebar sinistra (320px) + mappa destra (flex: 1)
- Script injection: `<%= apiKey %>` inserito nell'URL di caricamento Google Maps
- Fallback: placeholder text se Google Maps non carica

**Elementi interattivi principali:**
- `#sidebar` → Panel sinistro con controlli
- `#controls` → Bottoni (Rimuovi cerchio, Esporta JSON)
- `#places-list` → Lista UL con ristoranti (popolata da map.js)
- `#map-status` → Stato mappa (es. "Caricata con successo ✅")
- `#circle-coords`, `#circle-radius` → Info cerchio (updated da updateCircleInfo)
- `#map-overlay` → Div di errore (hidden by default, shown if API fails)

### Styling (`public/css/styles.css`)
- Layout: `#app { display: flex }` → sidebar + map side-by-side
- Map: `#map { height: 100vh; width: 100% }`
- Placeholder + overlay: posizionato absolutely sopra mappa
- Lista: `.place-item` con hover effect grigio chiaro

## ⚙️ Setup e Comandi

### Installazione
```bash
npm install
```

### Configurazione variabili ambiente (`.env`)
```
# Obbligatorio
GOOGLE_MAPS_API_KEY=AIzaSy...                  # Da Google Cloud Console

# Opzionali
PORT=3000                                      # Default: 3000
PLACES_FIELD_MASK=places.displayName,...       # Non usato attualmente nel codice
```

### Avvio
```bash
npm start
# Oppure equivalente:
node server.js
```
Accesso: `http://localhost:3000`

### Debug
```bash
# Verifica se API key è configurata
curl http://localhost:3000/status
# Response: {"ok":true,"hasGoogleKey":true}
```

## 🔑 Pattern e Convenzioni

### Normalization dei dati Place
Risultati di Google Places API possono arrivare in formati diversi. In `map.js` c'è una logica di normalizzazione in `searchPlaces()`:
- `place.displayName || place.name` → nome
- `place.address || place.formatted_address` → indirizzo
- `place.geometry.location.{lat,lng}` (funzioni) oppure `.{lat,lng}` (proprietà dirette)

**Quando modifichi ricerca:** assicurati di gestire entrambi i formati.

### Validazione dati
- **Backend**: valida params obbligatori (lat, lng, radius) prima di chiamare Google
- **Frontend**: escapeHtml() prima di iniettare nel DOM (previene XSS)
- **Coordinates**: 6 decimali di precisione (≈0.1m) mostrati nella sidebar

### Gestione stati mappa
- `mapStatusText` aggiornato in tempo reale da `setMapStatus()`
- Overlay di errore mostrato solo se messaggio contiene "errore"
- Tutti gli errori Google Maps loggati in console (console.error)

### Marker e lista sincronizzati
- Quando click su marker → apre infoWindow
- Quando click su voce lista → centra mappa, zoom 16, apre infoWindow
- Quando disegna nuovo cerchio → cancella marker e lista precedenti

## 🚀 Task Comuni

### Aggiungere filtro di tipo luogo
Modifica in `server.js` POST endpoint:
```javascript
const { includedTypes = ['restaurant', 'cafe'] } = req.body; // aggiungi 'cafe'
const url = `...&type=${encodeURIComponent(includedTypes[0])}&...`; // usa primo tipo
```

### Cambiare zoom iniziale
In `map.js`, funzione `initMap()`:
```javascript
const map = new google.maps.Map(document.getElementById('map'), {
  center,
  zoom: 15,  // Cambia da 13 a 15
  ...
});
```

### Personalizzare stile cerchio
In `map.js`, `drawingManager` circleOptions:
```javascript
circleOptions: {
  fillColor: '#0000ff',    // Blu invece di rosso
  fillOpacity: 0.2,        // Più opaco
  ...
}
```

### Aggiungere campi al JSON esportato
In `map.js`, funzione export JSON, modificare la map:
```javascript
const data = lastPlaces.map(p => ({
  name: p.name,
  vicinity: p.vicinity,
  website: p.website,  // Aggiungi nuovo campo
  ...
}));
```

## 🔍 File Chiave

| File | Responsabilità |
|------|---|
| File | Responsabilità |
|------|---|
| `server.js` | Backend Express, routing, integrazione Google Places API v1 |
| `views/layoutfinale.ejs` | **Nuovo Target**: Layout principale con design "Joyful" |
| `public/css/layoutfinale.css` | Styling nuovo layout (Palette colori, Flexbox) |
| `public/js/map.js` | **Main**: Orchestrator, initMap, coordinamento moduli |
| `public/js/search.js` | Logica ricerca Places API, filtri e gestione dati |
| `public/js/ui.js` | Gestione DOM, helper UI, stato interfaccia |
| `public/js/markers.js` | Gestione Marker, InfoWindow e interazioni mappa |
| `public/js/config.js` | Costanti e configurazioni globali |
| `views/index.ejs` | *Legacy*: Vecchio layout (reference) |
| `public/css/styles.css` | *Legacy*: Vecchio styling |
| `package.json` | Dipendenze e script npm |
| `.env` | Configurazione variabili ambiente (GOOGLE_MAPS_API_KEY) |

## ⚠️ Gotcha e Limitazioni

1. **Google Maps API key:** Se non configurata in `.env`, app renderizza ma mappa rimane bianca. Mostra overlay di errore dopo 4s.

2. **CORS:** Server-side proxy per Places API necessario perché client non può interrogare Google direttamente (CORS + limite richieste).

3. **Pagination:** Endpoint nearbysearch non supporta pagination token. Per risultati >20, servirebbero più parametri (es. pagetoken).

4. **Coordinate functions:** Su alcuni browser/versioni API, `.lat()` e `.lng()` sono funzioni, su altri sono proprietà. Codice gestisce entrambi.

5. **XSS Risk:** Tutti i dati dall'API devono passare per `escapeHtml()` prima di iniettarsi nel DOM. Non usare `innerHTML` senza sanitazione.

6. **Timeout Google Maps:** Se server è lento o rete assente, caricamento Maps fallisce silenziosamente. Timeout 4s rileva questo e mostra errore.

## 📚 Risorse Esterne
- [Google Maps API Docs](https://developers.google.com/maps/documentation/javascript/)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service/search-nearby)
- [Drawing Library](https://developers.google.com/maps/documentation/javascript/drawing)
