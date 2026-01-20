/**
 * map.js - File principale dell'applicazione (SNELLITO)
 * 
 * Inizializzazione mappa Google Maps e coordinamento moduli:
 * 1. Crea una mappa Google Maps centrata su Roma
 * 2. Permette all'utente di disegnare un cerchio sulla mappa
 * 3. Quando il cerchio è completato/modificato, cerca cibo via API server
 * 4. Mostra i risultati come marker sulla mappa e lista nella sidebar
 */

function initMap() {
  try {
    // ===== SETUP INIZIALE MAPPA =====
    const map = new google.maps.Map(document.getElementById('map'), {
      center: APP_CONFIG.DEFAULT_CENTER,
      zoom: APP_CONFIG.DEFAULT_ZOOM,
      mapTypeControl: false,
    });

    // ===== VARIABILI DI STATO =====
    let circle = null;
    let markers = [];
    let lastPlaces = [];
    let infoWindow = new google.maps.InfoWindow();
    let offsetCircles = [];
    let offsetCirclesData = [];
    let isAdjustingRadius = false;

    // ===== INIZIALIZZAZIONE UI =====
    initializeSearchInputs();
    
    setMapStatus('Caricata con successo ✅');
    const placeholder = document.getElementById('map-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    const overlayEl = document.getElementById('map-overlay');
    if (overlayEl) overlayEl.style.display = 'none';

    // ===== DRAWING MANAGER =====
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.CIRCLE]
      },
      circleOptions: {
        fillColor: '#ff0000',
        fillOpacity: 0.15,
        strokeWeight: 1,
        clickable: false,
        editable: true,
        draggable: true,
      }
    });
    drawingManager.setMap(map);

    // ===== CONTROLLO RAGGIO MASSIMO =====
    const radiusCheckInterval = setInterval(() => {
      if (circle && circle.getRadius() > APP_CONFIG.MAX_RADIUS) {
        if (!isAdjustingRadius) {
          isAdjustingRadius = true;
          circle.setRadius(APP_CONFIG.MAX_RADIUS);
          isAdjustingRadius = false;
        }
      }
    }, APP_CONFIG.RADIUS_CHECK_INTERVAL);

    // ===== FUNZIONI GESTIONE CERCHI OFFSET =====
    function createOffsetCircles() {
      if (!circle) return;
      
      offsetCircles.forEach(c => c.setMap(null));
      offsetCircles = [];
      offsetCirclesData = [];
      
      const center = circle.getCenter();
      const radius = circle.getRadius();
      const subCircles = calculate4SubCircles(center.lat(), center.lng(), radius);
      
      subCircles.forEach((subCircle, index) => {
        const search = DEFAULT_SEARCHES[index];
        
        const offsetCircle = new google.maps.Circle({
          center: subCircle.center,
          radius: subCircle.radius,
          map: map,
          fillColor: search.color,
          fillOpacity: 0.1,
          strokeColor: search.color,
          strokeWeight: 2,
          strokeOpacity: 0.6,
          clickable: false,
          editable: false,
          draggable: false
        });
        
        offsetCircles.push(offsetCircle);
        offsetCirclesData.push({ center: subCircle.center, radius: subCircle.radius });
      });

      console.log('\n=== 🟢 SOTTOCERCHI DISEGNATI (GOOGLE MAPS) ===');
      offsetCircles.forEach((c, idx) => {
        const ctr = c.getCenter();
        const rad = c.getRadius();
        console.log(`  Sottocerchio ${idx+1}: centro LAT=${ctr.lat().toFixed(6)}, LNG=${ctr.lng().toFixed(6)}, RAGGIO=${Math.round(rad)}m`);
      });
      console.log('='.repeat(50));
    }

    function updateOffsetCircles() {
      if (!circle || offsetCircles.length === 0) return;
      
      const center = circle.getCenter();
      const radius = circle.getRadius();
      const subCircles = calculate4SubCircles(center.lat(), center.lng(), radius);
      
      for (let i = 0; i < 4 && i < offsetCircles.length; i++) {
        offsetCircles[i].setCenter(subCircles[i].center);
        offsetCircles[i].setRadius(subCircles[i].radius);
        offsetCirclesData[i] = { center: subCircles[i].center, radius: subCircles[i].radius };
      }
    }

    // ===== EVENT LISTENERS =====
    
    // Cerchio completato
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(newCircle) {
      if (circle) circle.setMap(null);
      circle = newCircle;
      
      if (circle.getRadius() > APP_CONFIG.MAX_RADIUS) {
        isAdjustingRadius = true;
        circle.setRadius(APP_CONFIG.MAX_RADIUS);
        isAdjustingRadius = false;
      }
      
      createOffsetCircles();
      
      circle.addListener('radius_changed', () => { 
        if (isAdjustingRadius) return;
        
        if (circle.getRadius() > APP_CONFIG.MAX_RADIUS) {
          isAdjustingRadius = true;
          circle.setRadius(APP_CONFIG.MAX_RADIUS);
          isAdjustingRadius = false;
          return;
        }
        updateCircleInfo(circle);
        updateOffsetCircles();
        executeSearch();
      });
      
      circle.addListener('center_changed', () => { 
        updateCircleInfo(circle);
        updateOffsetCircles();
        executeSearch();
      });
      
      updateCircleInfo(circle);
      executeSearch();
    });

    // Bottone rimuovi cerchio
    const clearBtn = document.getElementById('clear-circle');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (circle) { 
          circle.setMap(null);
          circle = null; 
        }
        offsetCircles.forEach(c => c.setMap(null));
        offsetCircles = [];
        offsetCirclesData = [];
        
        clearMarkers(markers);
        const placesListEl = document.getElementById('places-list');
        if (placesListEl) placesListEl.innerHTML = '';
        
        const coordsEl = document.getElementById('circle-coords');
        const radiusEl = document.getElementById('circle-radius');
        if (coordsEl) coordsEl.innerText = '—';
        if (radiusEl) radiusEl.innerText = '—';
        lastPlaces = [];
      });
    }

    // Bottone ricerca di nuovo
    const refreshBtn = document.getElementById('refresh-search');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (!circle) {
          alert('Disegna prima un cerchio sulla mappa');
          return;
        }
        executeSearch();
      });
    }

    // Bottone ricarica mappa
    const reloadBtn = document.getElementById('reload-map');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // Bottone esporta JSON
    const exportBtn = document.getElementById('export-json');
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.addEventListener('click', () => {
        if (!lastPlaces || lastPlaces.length === 0) {
          alert('Nessun cibo da esportare. Disegna prima un cerchio e attendi i risultati.');
          return;
        }
        
        const data = lastPlaces.map(p => {
          const latVal = (p.geometry && p.geometry.location && typeof p.geometry.location.lat === 'function') 
            ? p.geometry.location.lat() 
            : (p.geometry && p.geometry.location && p.geometry.location.lat !== undefined) 
              ? p.geometry.location.lat 
              : (p.geometry && p.geometry.location && p.geometry.location.latitude) 
                ? p.geometry.location.latitude 
                : null;
          const lngVal = (p.geometry && p.geometry.location && typeof p.geometry.location.lng === 'function') 
            ? p.geometry.location.lng() 
            : (p.geometry && p.geometry.location && p.geometry.location.lng !== undefined) 
              ? p.geometry.location.lng 
              : (p.geometry && p.geometry.location && p.geometry.location.longitude) 
                ? p.geometry.location.longitude 
                : null;
          
          return {
            name: p.name,
            vicinity: p.vicinity || null,
            place_id: p.place_id || null,
            lat: latVal,
            lng: lngVal,
            rating: p.rating || null
          };
        });
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ristoranti.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // ===== FUNZIONE ESEGUI RICERCA =====
    async function executeSearch() {
      if (!circle) return;
      
      const results = await searchPlaces(circle, map, markers, infoWindow, offsetCirclesData);
      lastPlaces = results;
      
      if (exportBtn) exportBtn.disabled = results.length === 0;
    }

  } catch (err) {
    console.error('Errore durante initMap:', err);
    showMapErrorOverlay('Si è verificato un errore durante l\'inizializzazione della mappa. Controlla la console per dettagli.');
    setMapStatus('Errore: initMap');
  }
}

// Esponi initMap al scope globale
window.initMap = initMap;

// ===== GESTIONE ERRORI GOOGLE MAPS API =====

window.mapLoadError = function() {
  const msg = 'Impossibile caricare il Google Maps JS (script). Controlla la connessione e la chiave API.';
  showMapErrorOverlay(msg);
  setMapStatus('Errore: script non caricato');
  console.error(msg);
};

window.gm_authFailure = function() {
  const msg = 'Autenticazione Google Maps fallita: la chiave API potrebbe essere invalida o con restrizioni. Controlla la console e le impostazioni nella Google Cloud Console.';
  showMapErrorOverlay(msg);
  setMapStatus('Errore: Autenticazione fallita');
};

setTimeout(() => {
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    const msg = 'Google Maps JS non è stato caricato (timeout). Controlla la chiave API e la connessione.';
    showMapErrorOverlay(msg);
    setMapStatus('Errore: API non caricata');
  }
}, APP_CONFIG.MAP_LOAD_TIMEOUT);