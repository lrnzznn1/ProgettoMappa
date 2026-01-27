/**
 * map.js - CONTROLLER Principale
 * Coordina Mappa, Disegno, Ricerca (search.js), UI (ui.js) e Stato (state.js)
 */

let map;
let drawingManager;
let currentCircle = null;
let infoWindow;       // Finestra info singola condivisa
let markers = [];     // Array per tracciare i marker sulla mappa
let offsetCirclesData = []; // Dati posizione cerchi 1-4

/**
 * initMap() - Punto di ingresso chiamato da Google Maps API
 */
async function initMap() {
    try {
        // 1. Inizializza Mappa
        const rome = APP_CONFIG.DEFAULT_CENTER || { lat: 41.9028, lng: 12.4964 };
        map = new google.maps.Map(document.getElementById("map"), {
            center: rome,
            zoom: APP_CONFIG.DEFAULT_ZOOM || 13,
            mapTypeId: "roadmap",
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [ // Stili semplificati
                { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
                { "featureType": "transit", "elementType": "labels", "stylers": [{ "visibility": "off" }] }
            ]
        });

        // 2. Inizializza InfoWindow
        infoWindow = new google.maps.InfoWindow();

        // 3. Inizializza DrawingManager
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.CIRCLE,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.CIRCLE],
            },
            circleOptions: {
                fillColor: "#667eea",
                fillOpacity: 0.15,
                strokeWeight: 2,
                strokeColor: '#667eea',
                clickable: false,
                editable: false, // Disabilitato default, attiveremo dopo
                zIndex: 1,
            },
        });
        drawingManager.setMap(map);

        // 4. Inizializza UI e Eventi
        if(window.UIManager) UIManager.init();
        if(typeof initializeSearchInputs === 'function') initializeSearchInputs();
        initializeEvents();
        
        console.log("Mappa inizializzata con successo");
        setMapStatus("Mappa pronta. Disegna un cerchio per cercare.");

    } catch (err) {
        console.error("Errore initMap:", err);
        showMapErrorOverlay("Errore inizializzazione mappa: " + err.message);
    }
}

/**
 * Configura tutti gli event listener
 */
function initializeEvents() {
    // Evento: Cerchio completato
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
        // Rimuovi cerchio precedente se esiste
        if (currentCircle) {
            currentCircle.setMap(null);
            currentCircle = null;
        }

        currentCircle = circle;
        
        // Disattiva modalità disegno per evitare cerchi multipli
        drawingManager.setDrawingMode(null);

        // Aggiungi listener per modifica cerchio (resize/move) - Debounced?
        circle.addListener('radius_changed', () => performSearch(circle));
        circle.addListener('center_changed', () => performSearch(circle));

        // Rendi il cerchio modificabile
        circle.setEditable(true);
        circle.setDraggable(true);

        // Esegui prima ricerca immediata
        performSearch(circle);
    });

    // Eventi Bottoni UI (controllo esistenza prima)
    const removeBtn = document.getElementById('clear-circle'); // ID corretto dal vecchio map.js
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (currentCircle) {
                currentCircle.setMap(null);
                currentCircle = null;
            }
            clearApp();
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.CIRCLE); // Riabilita disegno
            setMapStatus("Cerchio rimosso. Pronto.");
        });
    }

    const refreshBtn = document.getElementById('refresh-search'); // ID corretto
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (currentCircle) performSearch(currentCircle);
            else alert("Disegna prima un cerchio!");
        });
    }

    const exportBtn = document.getElementById('export-report');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const places = appState.currentSearchResults; // Nuovo path stato
            if (places && places.length > 0) {
                 if(typeof generatePdfReport === 'function') {
                    generatePdfReport(places, currentCircle);
                 } else {
                    alert("Funzione PDF non disponibile.");
                 }
            } else {
                alert("Nessun dato da esportare (nessuna ricerca attiva o risultati vuoti).");
            }
        });
    }
}

/**
 * performSearch(circle) - Cuore dell'applicazione
 * 1. Pulisce tutto
 * 2. Visualizza loader
 * 3. Chiama API
 * 4. Disegna risultati
 */
async function performSearch(circle) {
    if (!circle) return;

    // --- 1. Preparazione UI ---
    if(window.UIManager) {
        UIManager.setLoading(true);
        UIManager.updateCircleStats(circle.getCenter(), circle.getRadius());
    }
    setMapStatus("Ricerca in corso...");
    
    // Disabilita interazioni cerchio durante ricerca per evitare flood
    // Opzionale: se la UX è fastidiosa, rimuovi queste due righe
    circle.setEditable(false); 
    circle.setDraggable(false);

    try {
        // --- 2. Pulizia Dati Precedenti ---
        clearMarkers(markers); // Funzione in markers.js
        if(window.UIManager) UIManager.clearResults();
        
        // --- 3. Calcolo Geometria (Sottocerchi) ---
        // Calcola i 4 cerchi interni per le ricerche specifiche
        // Usiamo la funzione di geometry.js se esiste, o fallback locale
        if (typeof calculate4SubCircles === 'function') {
             const sub = calculate4SubCircles(circle.getCenter().lat(), circle.getCenter().lng(), circle.getRadius());
             offsetCirclesData = sub.map(s => ({ center: s.center, radius: s.radius }));
        } else {
             offsetCirclesData = calculateOffsetCirclesData(circle); 
        }

        // --- 4. Chiamata al Servizio (search.js) ---
        // searchPlaces restituisce una Promise con l'array dei posti Puliti
        const places = await searchPlaces(circle, offsetCirclesData);

        // --- 5. Aggiornamento State ---
        if (window.appState) {
            appState.setSearchResults(places);
        }

        // --- 6. Aggiornamento Mappa e Lista ---
        if (places && places.length > 0) {
            // Aggiungi marker (usa funzione di markers.js)
            places.forEach(place => {
                addPlaceMarker(place, map, markers, infoWindow);
            });
            
            // Renderizza lista laterale (usa UIManager)
            if(window.UIManager) {
                UIManager.renderPlacesList(places, map, markers);
            }
            
            setMapStatus(`Trovati ${places.length} posti!`);
        } else {
            if(window.UIManager) UIManager.renderPlacesList([], map, markers);
            setMapStatus("Nessun risultato trovato.");
        }

    } catch (error) {
        console.error("Errore critico ricerca:", error);
        if(window.UIManager) UIManager.showError(error.message || "Errore sconosciuto durante la ricerca");
        setMapStatus("Errore durante la ricerca.");
    } finally {
        // --- 7. Ripristino UI ---
        if(window.UIManager) UIManager.setLoading(false);
        if (currentCircle) {
            currentCircle.setEditable(true);
            currentCircle.setDraggable(true);
        }
    }
}

/**
 * Pulisce lo stato dell'app (marker, lista, stato)
 */
function clearApp() {
    clearMarkers(markers); // marker.js
    if(window.UIManager) UIManager.clearResults();
    if(window.appState) {
        appState.setSearchResults([]);
    }
}

/**
 * Helper per calcolare i 4 sottocerchi (Fallback se geometry.js non va)
 */
function calculateOffsetCirclesData(mainCircle) {
    const center = mainCircle.getCenter();
    const radius = mainCircle.getRadius(); // Raggio totale
    const rSmall = radius / 2; // Raggio cerchi piccoli
    
    // Logica "Quadrifoglio": Nord-Ovest, Nord-Est, Sud-Est, Sud-Ovest
    const dLat = (rSmall / 2) / 111320; 
    const dLng = (rSmall / 2) / (40075000 * Math.cos(center.lat() * Math.PI / 180) / 360);

    return [
        { center: { lat: center.lat() + dLat, lng: center.lng() - dLng }, radius: rSmall }, // NO
        { center: { lat: center.lat() + dLat, lng: center.lng() + dLng }, radius: rSmall }, // NE
        { center: { lat: center.lat() - dLat, lng: center.lng() - dLng }, radius: rSmall }, // SO
        { center: { lat: center.lat() - dLat, lng: center.lng() + dLng }, radius: rSmall }  // SE
    ];
}

// Esponi initMap
window.initMap = initMap;

// Esponi gestione errori globali
window.mapLoadError = () => {
    if(window.UIManager) UIManager.showError('Impossibile caricare Google Maps API.');
};
window.gm_authFailure = () => {
    if(window.UIManager) UIManager.showError('Autenticazione Google Maps Fallita. Verifica API Key.');
};

// Timeout check se maps non carica proprio
setTimeout(() => {
    if (typeof google === 'undefined') {
        if(window.mapLoadError) window.mapLoadError();
    }
}, 8000);
