/**
 * config.js - Configurazioni e costanti per l'applicazione
 */

// ===== CONFIGURAZIONI RICERCHE - MATRICE CENTRALIZZATA =====
/**
 * Matrice con le configurazioni di default per le ricerche
 * Ogni ricerca ha:
 *   - searchNumber: numero della ricerca (1-9)
 *   - label: etichetta descrittiva
 *   - includedTypes: array di tipi da cercare
 *   - excludedTypes: array di tipi da escludere
 *   - color: colore associato per la visualizzazione
 *   - radius: raggio specifico per la ricerca (optional, default: raggio del cerchio)
 *   - offsetLat: offset in latitudine dal centro (optional, in gradi decimali)
 *   - offsetLng: offset in longitudine dal centro (optional, in gradi decimali)
 * 
 * NOTA: Le ricerche 1a-1d sono varianti SPAZIALI della ricerca 1 (FoodMain)
 * con raggi e offset diversi. Le ricerche 2-6 restano come prima.
 */
const DEFAULT_SEARCHES = [
  // ===== RICERCA 1: RESTAURANT - 4 VARIANTI SPAZIALI =====
  {
    searchNumber: 1,
    label: 'FoodMain-NordOvest',
    includedTypes: ['restaurant', 'food_court'],
    excludedTypes: ['lodging', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#d32f2f', // Rosso
    radius: 1500,     // Raggio in metri
    offsetLat: 0.015, // ~1.5 km Nord (lat aumenta verso Nord)
    offsetLng: -0.015 // ~1.5 km Ovest (lng diminuisce verso Ovest)
  },
  {
    searchNumber: 2,
    label: 'FoodMain-NordEst',
    includedTypes: ['restaurant', 'food_court'],
    excludedTypes: ['lodging', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#ff6f00', // Arancio
    radius: 1500,
    offsetLat: 0.015,  // Nord
    offsetLng: 0.015   // Est
  },
  {
    searchNumber: 3,
    label: 'FoodMain-SudOvest',
    includedTypes: ['restaurant', 'food_court'],
    excludedTypes: ['lodging', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#1565c0', // Blu
    radius: 1500,
    offsetLat: -0.015, // Sud (lat diminuisce verso Sud)
    offsetLng: -0.015  // Ovest
  },
  {
    searchNumber: 4,
    label: 'FoodMain-SudEst',
    includedTypes: ['restaurant', 'food_court'],
    excludedTypes: ['lodging', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#2e7d32', // Verde
    radius: 1500,
    offsetLat: -0.015, // Sud
    offsetLng: 0.015   // Est
  },
  
  // ===== RICERCHE 5-9: COME PRIMA =====
  {
    searchNumber: 5,
    label: 'FoodCafe',
    includedTypes: ['cafe', 'bar', 'ice_cream_shop', 'bakery', 'wine_bar', 'market'],
    excludedTypes: ['lodging', 'hotel', 'hostel', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#1976d2' // Blu
  },
  {
    searchNumber: 6,
    label: 'History',
    includedTypes: ['historical_landmark', 'church', 'monument'],
    excludedTypes: ['school', 'primary_school', 'secondary_school', 'university', 'city_hall', 'local_government_office', 'courthouse', 'embassy', 'library', 'funeral_home', 'cemetery', 'gym', 'physiotherapist', 'dentist', 'doctor'],
    color: '#388e3c' // Verde
  },
  {
    searchNumber: 7,
    label: 'Museums',
    includedTypes: ['museum', 'art_gallery', 'cultural_center', 'tourist_attraction'],
    excludedTypes: ['school', 'primary_school', 'secondary_school', 'university', 'city_hall', 'local_government_office', 'courthouse', 'embassy', 'library', 'funeral_home', 'cemetery', 'gym', 'physiotherapist', 'dentist', 'doctor'],
    color: '#7b1fa2' // Viola
  },
  {
    searchNumber: 8,
    label: 'NatureGreen',
    includedTypes: ['park', 'garden', 'botanical_garden', 'national_park', 'beach', 'plaza'],
    excludedTypes: ['campground', 'rv_park', 'camping_cabin', 'golf_course', 'stadium', 'playground', 'lodging', 'hotel'],
    color: '#f57c00' // Arancio
  },
  {
    searchNumber: 9,
    label: 'Entertainment',
    includedTypes: ['amusement_park', 'aquarium', 'zoo', 'observation_deck', 'marina'],
    excludedTypes: ['campground', 'rv_park', 'camping_cabin', 'golf_course', 'stadium', 'playground', 'lodging', 'hotel'],
    color: '#00897b' // Teal
  }
];

// ===== COSTANTI APPLICAZIONE =====
const APP_CONFIG = {
  DEFAULT_CENTER: { lat: 41.9028, lng: 12.4964 }, // Centro di Roma
  DEFAULT_ZOOM: 13,
  MAX_RADIUS: 25000, // 25 km in metri - vincolo default (modificabile via UI)
  RADIUS_CHECK_INTERVAL: 50, // ms per controllo raggio
  MAP_LOAD_TIMEOUT: 4000, // 4s timeout per caricamento Google Maps
  
  // Parametri algoritmo sottocerchi
  SUB_RADIUS_RATIO: 0.70,  // 70% del raggio principale
  OFFSET_RATIO: 0.50,      // 50% del raggio principale per offset
};