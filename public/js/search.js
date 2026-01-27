/**
 * search.js - Servizio puro per la ricerca di luoghi (Service)
 * RESTITUISCE PROMISE, NON TOCCA IL DOM
 */

/**
 * Esegue le chiamate API parallele e restituisce i dati normalizzati
 * @param {google.maps.Circle} circle - Il cerchio disegnato
 * @param {Array} offsetCirclesData - Dati precalcolati per ricerche 1-4
 * @returns {Promise<Array<Place>>} - Promise che risolve con l'array di luoghi unici
 */
async function searchPlaces(circle, offsetCirclesData) {
  const center = circle.getCenter();
  const radius = Math.round(circle.getRadius());
  const searchConfigs = getSearchConfigs();

  console.log('🔍 [Service] Inizio ricerca:', { lat: center.lat(), lng: center.lng(), radius });

  // 1. Prepara le chiamate API
  const searchPromises = searchConfigs.map((config, idx) => {
    let searchLat = center.lat();
    let searchLng = center.lng();
    let searchRadius = radius;

    // Logica speciale per ricerche 1-4 (sottocerchi)
    if (config.searchNumber >= 1 && config.searchNumber <= 4 && offsetCirclesData[idx]) {
      searchLat = offsetCirclesData[idx].center.lat;
      searchLng = offsetCirclesData[idx].center.lng;
      searchRadius = offsetCirclesData[idx].radius;
    } else {
      // Logica offset standard
      if (config.offsetLat !== undefined) searchLat += config.offsetLat;
      if (config.offsetLng !== undefined) searchLng += config.offsetLng;
      if (config.radius !== undefined) searchRadius = config.radius;
    }

    const payload = { 
      lat: searchLat, 
      lng: searchLng, 
      radius: searchRadius,
      includedTypes: config.includedTypes,
      excludedTypes: config.excludedTypes,
      rankPreference: "POPULARITY"
    };

    return fetch('/api/places/searchNearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(json => ({ searchNumber: config.searchNumber, data: json }))
    .catch(err => ({ searchNumber: config.searchNumber, error: err.message }));
  });

  // 2. Esegui in parallelo
  const allResults = await Promise.all(searchPromises);
  
  // 3. Processa e Normalizza
  let rawPlaces = [];
  
  allResults.forEach(result => {
      // Salta errori
      if (result.error || !result.data || !result.data.ok) {
          console.warn(`[Service] Ricerca ${result.searchNumber} fallita o vuota`);
          return;
      }
      
      const data = result.data.data || {};
      let apisResults = data.places || [];

      // Filtro geometrico per Cerchi 1-4 (deve stare nel cerchio principale)
      if ([1,2,3,4].includes(result.searchNumber)) {
        apisResults = apisResults.filter(place => {
            if (!place.location) return false;
            // Usa geometry.js se disponibile, o calcolo manuale
            const dist = typeof haversineDistance === 'function' 
                ? haversineDistance(center.lat(), center.lng(), place.location.latitude, place.location.longitude)
                : 0; // Fallback se manca libreria (ma geometry.js dovrebbe esserci)
            return dist <= radius;
        });
      }

      // Converti in oggetti Place
      apisResults.forEach(placeData => {
          // Crea istanza Place (assume che place.js sia caricato)
          const pl = new Place(placeData, result.searchNumber);
          
          // Scarta se coordinate non valide
          if (pl.location && (pl.location.lat !== 0 || pl.location.lng !== 0)) {
              rawPlaces.push(pl);
          }
      });
  });

  // 4. Filtra Duplicati (assume duplicates.js loaded)
  if (typeof filterDuplicates === 'function') {
      return filterDuplicates(rawPlaces);
  }
  
  return rawPlaces;
}
/**
 * Calcola la distanza tra due coordinate usando la formula di Haversine
 * (Spostata da geometry.js per ridurre i file)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // raggio medio Terra in metri
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
