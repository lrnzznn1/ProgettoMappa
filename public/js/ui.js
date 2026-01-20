/**
 * ui.js - Funzioni per manipolazione DOM e interfaccia utente
 */

// ===== FUNZIONI HELPER DOM =====

/**
 * escapeHtml(unsafe) - Previene attacchi XSS sostituendo caratteri speciali
 * Esempio: <script> diventa &lt;script&gt;
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[&<>"'`]/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      case '`': return '&#96;';
      default: return m;
    }
  });
}

/**
 * setMapStatus(message) - Aggiorna il testo dello stato nella sidebar
 * Se il messaggio contiene "errore", mostra anche un overlay con i dettagli
 */
function setMapStatus(message) {
  const mapStatusText = document.getElementById('map-status-text');
  if (mapStatusText) mapStatusText.innerText = message;
  
  const overlay = document.getElementById('map-overlay');
  if (overlay && message && message.toLowerCase().includes('errore')) 
    overlay.style.display = 'flex'; // Mostra overlay di errore
}

/**
 * updateCircleInfo(circle) - Aggiorna le coordinate e il raggio mostrati nella sidebar
 */
function updateCircleInfo(circle) {
  if (!circle) return;
  
  const center = circle.getCenter();
  const radius = Math.round(circle.getRadius());
  
  const coordsEl = document.getElementById('circle-coords');
  const radiusEl = document.getElementById('circle-radius');
  
  // Mostra le coordinate con 6 decimali (precisione di ~0.1 metri)
  if (coordsEl) coordsEl.innerText = `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}`;
  // Mostra il raggio arrotondato in metri
  if (radiusEl) radiusEl.innerText = radius.toString();
}

/**
 * initializeSearchInputs() - Popola gli input HTML con i valori di default da DEFAULT_SEARCHES
 */
function initializeSearchInputs() {
  DEFAULT_SEARCHES.forEach(search => {
    const includedInput = document.querySelector(`input[data-search="${search.searchNumber}"][data-type="included"]`);
    const excludedInput = document.querySelector(`input[data-search="${search.searchNumber}"][data-type="excluded"]`);
    
    if (includedInput && !includedInput.value) {
      includedInput.value = search.includedTypes.join(', ');
    }
    
    if (excludedInput && !excludedInput.value) {
      excludedInput.value = search.excludedTypes.join(', ');
    }
  });
}

/**
 * getSearchConfigs() - Ottiene le configurazioni delle 9 ricerche
 * Legge i valori dagli input HTML, con fallback ai valori di default
 */
function getSearchConfigs() {
  const configs = [];
  
  DEFAULT_SEARCHES.forEach((search, index) => {
    // Per le ricerche personalizzabili (non la ricerca 1-4 con offset)
    if (search.searchNumber > 4) {
      const includedInput = document.querySelector(`input[data-search="${search.searchNumber}"][data-type="included"]`);
      const excludedInput = document.querySelector(`input[data-search="${search.searchNumber}"][data-type="excluded"]`);
      
      const includedValue = includedInput?.value || '';
      const excludedValue = excludedInput?.value || '';
      
      const included = includedValue.trim().length > 0 
        ? includedValue.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : search.includedTypes;
      
      const excluded = excludedValue.trim().length > 0 
        ? excludedValue.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : search.excludedTypes;
      
      configs.push({
        searchNumber: search.searchNumber,
        includedTypes: included.length > 0 ? included : ['restaurant'],
        excludedTypes: excluded.length > 0 ? excluded : [],
        radius: search.radius,
        offsetLat: search.offsetLat,
        offsetLng: search.offsetLng,
        color: search.color
      });
    } else {
      // Per le ricerche 1-4 (Food variants) copia direttamente da DEFAULT_SEARCHES
      configs.push({
        searchNumber: search.searchNumber,
        includedTypes: search.includedTypes,
        excludedTypes: search.excludedTypes,
        radius: search.radius,
        offsetLat: search.offsetLat,
        offsetLng: search.offsetLng,
        color: search.color
      });
    }
  });
  
  return configs;
}

/**
 * getSearchColor(searchNumber) - Restituisce il colore associato a ogni ricerca
 */
function getSearchColor(searchNumber) {
  const search = DEFAULT_SEARCHES[searchNumber - 1];
  return search ? search.color : '#999';
}

/**
 * showMapErrorOverlay(msg) - Mostra un overlay di errore a schermo
 * Usato quando Google Maps non carica o fallisce l'autenticazione
 */
function showMapErrorOverlay(msg) {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex'; // Mostra l'overlay
  if (msg) {
    const target = overlay.querySelector('.overlay-content p');
    if (target) target.innerText = msg; // Aggiorna il messaggio di errore
  }
}

// Esponi le funzioni globalmente
if (typeof window !== 'undefined') {
  window.setMapStatus = setMapStatus;
  window.showMapErrorOverlay = showMapErrorOverlay;
}