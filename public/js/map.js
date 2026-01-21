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
      streetViewControl: false, 
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          "featureType": "poi",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }] // Nasconde etichette POI per mappa più pulita
        },
        {
          "featureType": "transit",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }] // Nasconde etichette trasporti
        },
        {
          "featureType": "landscape.man_made",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#a8c8f5" }, { "lightness": 30 }]
        },
        {
          "featureType": "landscape",
          "elementType": "geometry",
          "stylers": [{ "color": "#e8f0e8" }, { "lightness": 5 }]
        },
        {
          "featureType": "landscape.natural",
          "elementType": "geometry",
          "stylers": [{ "color": "#d4e5d4" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry.fill",
          "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry.stroke",
          "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }]
        },
        {
          "featureType": "road.arterial",
          "elementType": "geometry",
          "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }]
        },
        {
          "featureType": "road.local",
          "elementType": "geometry",
          "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }]
        }
      ],
      gestureHandling: 'greedy', // Permette zoom senza Ctrl
      disableDoubleClickZoom: false,
      scrollwheel: true
    });

    // ===== VARIABILI DI STATO =====
    let circle = null;
    let markers = [];
    let lastPlaces = [];
    let infoWindow = new google.maps.InfoWindow();
    let offsetCircles = [];
    let offsetCirclesData = [];
    let isAdjustingRadius = false;

    // ===== FUNZIONE RAGGIO MASSIMO =====
    function getCurrentMaxRadius() {
      const selector = document.getElementById('max-radius-selector');
      return selector ? parseInt(selector.value) : APP_CONFIG.MAX_RADIUS;
    }

    // ===== INIZIALIZZAZIONE UI =====
    initializeSearchInputs();
    
    setMapStatus('Caricata con successo ✅');
    const placeholder = document.getElementById('map-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    const overlayEl = document.getElementById('map-overlay');
    if (overlayEl) overlayEl.style.display = 'none';

    // Aggiungi controlli personalizzati e animazioni
    if (typeof addCustomMapControls === 'function') addCustomMapControls(map);
    if (typeof animateMapControls === 'function') animateMapControls();

    // ===== DRAWING MANAGER =====
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [google.maps.drawing.OverlayType.CIRCLE]
      },
      circleOptions: {
        fillColor: '#667eea',
        fillOpacity: 0.15,
        strokeWeight: 2,
        strokeColor: '#667eea',
        strokeOpacity: 0.8,
        clickable: false,
        editable: true,
        draggable: true,
        zIndex: 1
      }
    });
    drawingManager.setMap(map);

    // ===== CONTROLLO RAGGIO MASSIMO =====
    const radiusCheckInterval = setInterval(() => {
      const maxRadius = getCurrentMaxRadius();
      if (circle && circle.getRadius() > maxRadius) {
        if (!isAdjustingRadius) {
          isAdjustingRadius = true;
          circle.setRadius(maxRadius);
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
      
      // Calcoliamo i dati per la ricerca ma NON disegniamo i cerchi sulla mappa
      subCircles.forEach((subCircle, index) => {
        // Mantiene solo i dati logici, non gli oggetti grafici
        offsetCirclesData.push({ center: subCircle.center, radius: subCircle.radius });
      });

      console.log('\n=== 🟢 DATI SOTTOCERCHI CALCOLATI (VISUALIZZAZIONE NASCOSTA) ===');
    }

    function updateOffsetCircles() {
      // Se non c'è il cerchio principale, usciamo
      if (!circle) return;
      
      const center = circle.getCenter();
      const radius = circle.getRadius();
      const subCircles = calculate4SubCircles(center.lat(), center.lng(), radius);
      
      // Aggiorniamo solo i dati logici
      offsetCirclesData = [];
      for (let i = 0; i < 4; i++) {
        offsetCirclesData[i] = { center: subCircles[i].center, radius: subCircles[i].radius };
      }
    }

    // ===== EVENT LISTENERS =====
    
    // Cerchio completato
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(newCircle) {
      if (circle) circle.setMap(null);
      circle = newCircle;
      
      const maxRadius = getCurrentMaxRadius();
      if (circle.getRadius() > maxRadius) {
        isAdjustingRadius = true;
        circle.setRadius(maxRadius);
        isAdjustingRadius = false;
      }
      
      createOffsetCircles();
      
      circle.addListener('radius_changed', () => { 
        if (isAdjustingRadius) return;
        
        const maxRadius = getCurrentMaxRadius();
        if (circle.getRadius() > maxRadius) {
          isAdjustingRadius = true;
          circle.setRadius(maxRadius);
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
        
        // Reset delle statistiche
        if (typeof resetSearchStats === 'function') resetSearchStats();
        
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

    // Bottone genera report PDF
    const exportBtn = document.getElementById('export-report');
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.addEventListener('click', () => {
        console.log('🔍 Debug export - lastPlaces:', lastPlaces);
        console.log('🔍 Debug export - lastPlaces length:', lastPlaces ? lastPlaces.length : 'undefined');
        
        if (!lastPlaces || lastPlaces.length === 0) {
          alert('Nessun risultato da includere nel report. Disegna prima un cerchio e attendi i risultati.');
          return;
        }
        generatePdfReport(lastPlaces, circle);
      });
    }

    // ===== FILTRI COLORE =====
    // Aggiungi event listener per i bottoni filtro colore
    const colorFilterBtns = document.querySelectorAll('.color-filter-btn');
    colorFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedColor = btn.dataset.color;
        
        // Rimuovi la classe active da tutti i bottoni
        colorFilterBtns.forEach(b => b.classList.remove('active'));
        
        // Aggiungi la classe active al bottone cliccato
        btn.classList.add('active');
        
        // Applica il filtro
        applyColorFilter(selectedColor, markers);
      });
    });
    
    // Imposta il filtro "Tutti" come attivo inizialmente
    const allBtn = document.querySelector('.color-filter-btn[data-color="all"]');
    if (allBtn) allBtn.classList.add('active');

    // ===== CONTROLLO RAGGIO MASSIMO =====
    const maxRadiusSelector = document.getElementById('max-radius-selector');
    if (maxRadiusSelector) {
      maxRadiusSelector.addEventListener('change', () => {
        const newMaxRadius = getCurrentMaxRadius();
        if (circle && circle.getRadius() > newMaxRadius) {
          isAdjustingRadius = true;
          circle.setRadius(newMaxRadius);
          isAdjustingRadius = false;
          updateCircleInfo(circle);
          updateOffsetCircles();
          executeSearch();
        }
      });
    }

    // ===== BOTTONE TOGGLE DEBUG API =====
    const toggleApiBtn = document.getElementById('toggle-api-response');
    if (toggleApiBtn) {
      toggleApiBtn.addEventListener('click', () => {
        const apiResponseEl = document.getElementById('api-response-container');
        if (apiResponseEl) {
          const isVisible = apiResponseEl.style.display === 'block';
          apiResponseEl.style.display = isVisible ? 'none' : 'block';
          toggleApiBtn.textContent = isVisible ? '🔍 Debug API' : '❌ Nascondi API';
        }
      });
    }

    // ===== FUNZIONE ESEGUI RICERCA =====
    async function executeSearch() {
      if (!circle) return;
      
      const results = await searchPlaces(circle, map, markers, infoWindow, offsetCirclesData);
      lastPlaces = results;
      
      // Mantieni il bottone sempre attivo (il controllo è nell'event listener)
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