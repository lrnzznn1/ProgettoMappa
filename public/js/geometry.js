/**
 * geometry.js - Funzioni per calcoli geometrici e gestione coordinate
 */

// ===== FUNZIONE: CALCOLA DISTANZA HAVERSINE =====
/**
 * Calcola la distanza tra due coordinate usando la formula di Haversine
 * @param {number} lat1 - Latitudine punto 1
 * @param {number} lng1 - Longitudine punto 1  
 * @param {number} lat2 - Latitudine punto 2
 * @param {number} lng2 - Longitudine punto 2
 * @returns {number} Distanza in metri
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

// ===== FUNZIONE: OFFSET COORDINATE =====
/**
 * Calcola coordinate offset data una distanza in km
 * @param {number} lat - Latitudine base
 * @param {number} lng - Longitudine base
 * @param {number} offsetX_km - Offset in km verso Est (positivo) o Ovest (negativo)
 * @param {number} offsetY_km - Offset in km verso Nord (positivo) o Sud (negativo)
 * @returns {object} Nuove coordinate {lat, lng}
 */
function offsetCoordinates(lat, lng, offsetX_km, offsetY_km) {
  // 1 grado di latitudine ≈ 111 km (costante)
  const latOffset = offsetY_km / 111;
  
  // 1 grado di longitudine varia con la latitudine
  // Formula: 111 * cos(lat) km per grado
  const lngOffset = offsetX_km / (111 * Math.cos(lat * Math.PI / 180));
  
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset
  };
}

// ===== FUNZIONE: CALCOLA 4 SOTTO-CERCHI =====
/**
 * calculate4SubCircles(centerLat, centerLng, radiusMeters)
 * Calcola posizione e dimensione dei 4 cerchi offset basato su algoritmo ottimizzato
 * 
 * PARAMETRI da APP_CONFIG:
 * - SUB_RADIUS_RATIO: i sotto-cerchi hanno il 70% del raggio principale
 * - OFFSET_RATIO: gli offset sono il 50% del raggio principale
 */
function calculate4SubCircles(centerLat, centerLng, radiusMeters) {
  const radiusKm = radiusMeters / 1000;
  
  // Calcola raggio e offset in km
  const subRadiusKm = radiusKm * APP_CONFIG.SUB_RADIUS_RATIO;
  const offsetKm = radiusKm * APP_CONFIG.OFFSET_RATIO;
  
  // Calcola i 4 centri (NW, NE, SW, SE)
  const circles = [
    { // Ricerca 1: Nord-Ovest
      direction: 'NW',
      center: offsetCoordinates(centerLat, centerLng, -offsetKm, offsetKm),
      radius: subRadiusKm * 1000 // Torna a metri
    },
    { // Ricerca 2: Nord-Est
      direction: 'NE',
      center: offsetCoordinates(centerLat, centerLng, offsetKm, offsetKm),
      radius: subRadiusKm * 1000
    },
    { // Ricerca 3: Sud-Ovest
      direction: 'SW',
      center: offsetCoordinates(centerLat, centerLng, -offsetKm, -offsetKm),
      radius: subRadiusKm * 1000
    },
    { // Ricerca 4: Sud-Est
      direction: 'SE',
      center: offsetCoordinates(centerLat, centerLng, offsetKm, -offsetKm),
      radius: subRadiusKm * 1000
    }
  ];
  
  return circles;
}