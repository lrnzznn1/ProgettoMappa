/**
 * ui.js - Gestisce tutti gli aggiornamenti dell'interfaccia utente (DOM)
 * tranne la mappa stessa (gestita da markers.js)
 */

const UIManager = {
    elements: {
        placesList: document.getElementById('places-list'),
        loader: document.getElementById('map-loader'),
        circleCoords: document.getElementById('circle-coords'),
        circleRadius: document.getElementById('circle-radius'),
        mapOverlay: document.getElementById('map-overlay'),
        mapStatus: document.getElementById('map-status'),
        exportBtn: document.getElementById('export-report'),
        mapContainer: document.getElementById('map')?.parentElement || document.body
    },

    // Inizializza gli elementi dopo il caricamento della pagina se necessario
    init() {
        this.elements.placesList = document.getElementById('places-list');
        this.elements.loader = document.getElementById('map-loader');
        this.elements.circleCoords = document.getElementById('circle-coords');
        this.elements.circleRadius = document.getElementById('circle-radius');
        this.elements.mapOverlay = document.getElementById('map-overlay');
        this.elements.mapStatus = document.getElementById('map-status');
        this.elements.exportBtn = document.getElementById('export-report');
    },

    // Gestione Loader
    setLoading(isLoading) {
        if (isLoading) {
            if (this.elements.loader) {
                this.elements.loader.classList.add('active');
                if (this.elements.loader.parentElement) {
                    this.elements.loader.parentElement.classList.add('loading');
                }
            }
        } else {
            if (this.elements.loader) {
                this.elements.loader.classList.remove('active');
                if (this.elements.loader.parentElement) {
                    this.elements.loader.parentElement.classList.remove('loading');
                }
            }
        }
    },

    // Pulizia interfaccia
    clearResults() {
        if (this.elements.placesList) this.elements.placesList.innerHTML = '';
        if (this.elements.circleCoords) this.elements.circleCoords.innerText = '—';
        if (this.elements.circleRadius) this.elements.circleRadius.innerText = '—';
    },

    // Aggiornamento Info Cerchio
    updateCircleStats(center, radius) {
        if (this.elements.circleCoords && center) {
            // lat e lng sono funzioni
            const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
            const lng = typeof center.lng === 'function' ? center.lng() : center.lng;
            this.elements.circleCoords.innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        if (this.elements.circleRadius) {
            this.elements.circleRadius.innerText = `${Math.round(radius)} m`;
        }
    },

    // Rendering Lista
    renderPlacesList(places, map, markers) {
        if (!this.elements.placesList) return;
        this.elements.placesList.innerHTML = ''; // Pulisce prima di aggiungere

        if (!places || places.length === 0) {
            // Assicuriamoci di creare elementi DOM corretti e non solo stringhe HTML
            const li = document.createElement('li');
            li.className = 'place-item';
            li.style.padding = '10px';
            li.style.textAlign = 'center';
            li.style.color = '#666';
            li.textContent = 'Nessun posto trovato in questa zona.';
            this.elements.placesList.appendChild(li);
            return;
        }

        // Raggruppa i risultati per tipo ricerca (1-9)
        const groupedBySearch = {};
        places.forEach(place => {
            // Estrai numero ricerca da searchSource string (es "Ricerca 1") o property
            let searchNum = '?';
            if (place.searchSource) {
                const match = place.searchSource.match(/\d+/);
                if (match) searchNum = match[0];
            }
            
            if (!groupedBySearch[searchNum]) {
                groupedBySearch[searchNum] = [];
            }
            groupedBySearch[searchNum].push(place);
        });

        // Ordina le chiavi (1, 2, 3...)
        const sortedKeys = Object.keys(groupedBySearch).sort((a,b) => parseInt(a)-parseInt(b));

        sortedKeys.forEach(key => {
            const groupPlaces = groupedBySearch[key];
            
            // Header del gruppo
            const header = document.createElement('li');
            header.className = 'search-section-header';
            header.style.backgroundColor = '#f0f0f0';
            header.style.padding = '8px';
            header.style.fontWeight = 'bold';
            header.style.marginTop = '8px';
            header.style.borderLeft = '4px solid ' + (typeof getSearchColor === 'function' ? getSearchColor(key) : '#ccc');
            header.textContent = `Ricerca ${key}: ${groupPlaces.length} risultati`;
            this.elements.placesList.appendChild(header);

            // Elementi del gruppo
            groupPlaces.forEach(place => {
                // Utilizziamo la funzione helper esistente o ne definiamo una interna se necessario
                // Per ora assumiamo che addPlaceToList sia GLOBALE (definita in markers.js o ui.js vecchio)
                // Se addPlaceToList richiede 'markers' per trovare l'associazione, glielo passiamo (non sempre usato)
                if (typeof window.addPlaceToList === 'function') {
                    window.addPlaceToList(place, markers, map);
                } else {
                    // Fallback semplice
                    const li = document.createElement('li');
                    li.textContent = place.name;
                    this.elements.placesList.appendChild(li);
                }
            });
        });

        // Aggiorna stato
        if (this.elements.mapStatus) {
            this.elements.mapStatus.innerText = `Trovati ${places.length} risultati unici`;
        }
    },

    // Gestione Errori
    showError(message) {
        if (this.elements.mapOverlay) {
            this.elements.mapOverlay.innerHTML = `
                <div class="overlay-content" style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                    <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Errore</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #eee; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Ricarica Pagina</button>
                </div>
            `;
            this.elements.mapOverlay.style.display = 'flex';
        }
        console.error("UI Error:", message);
    },

    hideError() {
        if (this.elements.mapOverlay) {
            this.elements.mapOverlay.style.display = 'none';
        }
    }
};

/**
 * Funzioni Helper esportate globalmente per compatibilità
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

// Esponi globalmente
window.UIManager = UIManager;
window.escapeHtml = escapeHtml;

/**
 * setMapStatus(message) - Aggiorna il testo dello stato nella sidebar
 * WRAPPER: Usa UIManager
 */
function setMapStatus(message) {
  // Nota: UIManager non aveva un metodo diretto per solo testo, ma gestiva lo stato
  const el = document.getElementById('map-status-text'); // O usa UIManager.elements.mapStatus
  if (el) el.innerText = message;
  
  // Se è un errore, usa il gestore centralizzato
  if (message && message.toLowerCase().includes('errore')) {
      UIManager.showError(message);
  }
}

/**
 * updateCircleInfo(circle) - Aggiorna le coordinate e il raggio mostrati nella sidebar
 * WRAPPER: Usa UIManager
 */
function updateCircleInfo(circle) {
  if (!circle) return;
  UIManager.updateCircleStats(circle.getCenter(), circle.getRadius());
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
 * WRAPPER: Usa UIManager
 */
function showMapErrorOverlay(msg) {
  UIManager.showError(msg);
}

// Esponi le funzioni globalmente
if (typeof window !== 'undefined') {
  window.setMapStatus = setMapStatus;
  window.showMapErrorOverlay = showMapErrorOverlay;
}