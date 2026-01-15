/**
 * map.js - Inizializzazione mappa Google Maps e logica di ricerca cibo
 * 
 * Questa funzione è il cuore dell'app lato client:
 * 1. Crea una mappa Google Maps centrata su Roma
 * 2. Permette all'utente di disegnare un cerchio sulla mappa
 * 3. Quando il cerchio è completato/modificato, cerca cibo via API server
 * 4. Mostra i risultati come marker sulla mappa e come lista nella sidebar
 */

// ===== CONFIGURAZIONI RICERCHE - MATRICE CENTRALIZZATA =====
/**
 * Matrice con le configurazioni di default per le 6 ricerche
 * Ogni ricerca ha:
 *   - searchNumber: numero della ricerca (1-6)
 *   - label: etichetta descrittiva
 *   - includedTypes: array di tipi da cercare
 *   - excludedTypes: array di tipi da escludere
 *   - color: colore associato per la visualizzazione
 */
const DEFAULT_SEARCHES = [
  {
    searchNumber: 1,
    label: 'FoodMain',
    includedTypes: ['restaurant', 'food_court'],
    excludedTypes: ['lodging', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#d32f2f' // Rosso
  },
  {
    searchNumber: 2,
    label: 'FoodCafe',
    includedTypes: ['cafe', 'bar', 'ice_cream_shop', 'bakery', 'wine_bar', 'market'],
    excludedTypes: ['lodging', 'hotel', 'hostel', 'meal_delivery', 'meal_takeaway', 'supermarket', 'grocery_store', 'convenience_store', 'gas_station', 'night_club', 'casino'],
    color: '#1976d2' // Blu
  },
  {
    searchNumber: 3,
    label: 'History',
    includedTypes: ['historical_landmark', 'church', 'monument'],
    excludedTypes: ['school', 'primary_school', 'secondary_school', 'university', 'city_hall', 'local_government_office', 'courthouse', 'embassy', 'library', 'funeral_home', 'cemetery', 'gym', 'physiotherapist', 'dentist', 'doctor'],
    color: '#388e3c' // Verde
  },
  {
    searchNumber: 4,
    label: 'Museums',
    includedTypes: ['museum', 'art_gallery', 'cultural_center', 'tourist_attraction'],
    excludedTypes: ['school', 'primary_school', 'secondary_school', 'university', 'city_hall', 'local_government_office', 'courthouse', 'embassy', 'library', 'funeral_home', 'cemetery', 'gym', 'physiotherapist', 'dentist', 'doctor'],
    color: '#7b1fa2' // Viola
  },
  {
    searchNumber: 5,
    label: 'NatureGreen',
    includedTypes: ['park', 'garden', 'botanical_garden', 'national_park', 'beach', 'plaza'],
    excludedTypes: ['campground', 'rv_park', 'camping_cabin', 'golf_course', 'stadium', 'playground', 'lodging', 'hotel'],
    color: '#f57c00' // Arancio
  },
  {
    searchNumber: 6,
    label: 'Entertainment',
    includedTypes: ['amusement_park', 'aquarium', 'zoo', 'observation_deck', 'marina'],
    excludedTypes: ['campground', 'rv_park', 'camping_cabin', 'golf_course', 'stadium', 'playground', 'lodging', 'hotel'],
    color: '#00897b' // Teal
  }
];

function initMap() {
  try {
    // ===== SETUP INIZIALE MAPPA =====
    const center = { lat: 41.9028, lng: 12.4964 }; // Centro di Roma (coordinate di default)
    const map = new google.maps.Map(document.getElementById('map'), {
      center,
      zoom: 13,
      mapTypeControl: false, // Nascondi i selettori di tipo mappa (satellite, terrain, etc)
    });

    // ===== RIFERIMENTI AL DOM =====
    // Questi elementi sono definiti in index.ejs e vengono usati qui per aggiornare l'interfaccia
    const placesListEl = document.getElementById('places-list'); // Lista elementi nella sidebar
    const clearBtn = document.getElementById('clear-circle');    // Bottone per cancellare il cerchio
    const apiResponseEl = document.getElementById('api-response-container'); // Contenitore risposta API
    const apiResponseTextEl = document.getElementById('api-response-text');   // Testo risposta API
    let circle = null;                                           // Variabile che tiene traccia del cerchio disegnato
    let markers = [];                                            // Array di marker sulla mappa
    let lastPlaces = [];                                         // Ultimi risultati di ricerca (per esportazione)
    let placesService = new google.maps.places.PlacesService(map);
    let infoWindow = new google.maps.InfoWindow();              // Finestra che appare al click su un marker
    const coordsEl = document.getElementById('circle-coords');  // Span che mostra le coordinate del cerchio
    const radiusEl = document.getElementById('circle-radius');  // Span che mostra il raggio del cerchio
    const mapStatusText = document.getElementById('map-status-text'); // Span che mostra lo stato della mappa

    // Funzione helper per ottenere le configurazioni delle 6 ricerche
    // Legge i valori dagli input HTML, con fallback ai valori di default
    function getSearchConfigs() {
      const configs = [];
      for (let i = 1; i <= 6; i++) {
        const includedInput = document.querySelector(`input[data-search="${i}"][data-type="included"]`);
        const excludedInput = document.querySelector(`input[data-search="${i}"][data-type="excluded"]`);
        
        // Leggi dai DEFAULT_SEARCHES oppure dagli input HTML
        const defaults = DEFAULT_SEARCHES[i - 1];
        
        const includedValue = includedInput?.value || '';
        const excludedValue = excludedInput?.value || '';
        
        const included = includedValue.trim().length > 0 
          ? includedValue.split(',').map(t => t.trim()).filter(t => t.length > 0)
          : defaults.includedTypes;
        
        const excluded = excludedValue.trim().length > 0 
          ? excludedValue.split(',').map(t => t.trim()).filter(t => t.length > 0)
          : defaults.excludedTypes;
        
        configs.push({
          searchNumber: i,
          includedTypes: included.length > 0 ? included : ['restaurant'],
          excludedTypes: excluded.length > 0 ? excluded : []
        });
      }
      return configs;
    }

    // ===== INIZIALIZZA GLI INPUT HTML CON I VALORI DI DEFAULT =====
    // Popola gli input se non hanno già un valore
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

    // ===== INIZIALIZZAZIONE DEGLI INPUT =====
    // Popola gli input HTML con i valori di default da DEFAULT_SEARCHES
    initializeSearchInputs();

    // ===== DRAWING MANAGER (Strumento di disegno cerchi) =====
    /**
     * DrawingManager permette all'utente di disegnare forme geometriche sulla mappa
     * In questo caso è configurato SOLO per disegnare cerchi
     * 
     * Proprietà importanti:
     * - drawingMode: Imposta quale forma disegnare (CIRCLE)
     * - drawingControl: Mostra il toolbar di disegno
     * - circleOptions: Stile del cerchio (colore rosso trasparente, editabile, draggable)
     */
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.CIRCLE]
      },
      circleOptions: {
        fillColor: '#ff0000',      // Colore di riempimento rosso
        fillOpacity: 0.15,         // Trasparenza 15%
        strokeWeight: 1,           // Spessore bordo
        clickable: false,          // Non cliccare il cerchio per aprire infoWindow
        editable: true,            // Permetti di trascinare il cerchio e cambiare il raggio
        draggable: true,           // Permetti di spostare il cerchio
      }
    });
    drawingManager.setMap(map); // Attiva il disegno sulla mappa

    // ===== AGGIORNAMENTO INTERFACCIA (Mappa caricata) =====
    if (mapStatusText) mapStatusText.innerText = 'Caricata con successo ✅';
    const placeholder = document.getElementById('map-placeholder');
    if (placeholder) placeholder.style.display = 'none'; // Nascondi il messaggio di caricamento
    const overlayEl = document.getElementById('map-overlay');
    if (overlayEl) overlayEl.style.display = 'none'; // Nascondi eventuali messaggi di errore precedenti

    // ===== EVENT LISTENER: CERCHIO COMPLETATO =====
    /**
     * Quando l'utente finisce di disegnare un cerchio:
     * 1. Rimuove il cerchio precedente (se esiste)
     * 2. Assegna il nuovo cerchio a quella variabile
     * 3. Aggiunge listener per quando il cerchio viene modificato
     * 4. Esegue la prima ricerca ristoranti
     */
    const maxRadius = 5000; // 10 km in metri - vincolo massimo
    let isAdjustingRadius = false; // Flag per evitare loop infiniti
    let radiusCheckInterval = null; // Interval per controllare il raggio durante il disegno
    
    // ===== POLLING PER LIMITARE RAGGIO DURANTE DISEGNO =====
    /**
     * Questo interval controlla continuamente il raggio del cerchio e lo limita a 10 km
     * Funziona sia durante il disegno iniziale che durante le modifiche successive
     */
    radiusCheckInterval = setInterval(() => {
      if (circle && circle.getRadius() > maxRadius) {
        if (!isAdjustingRadius) {
          isAdjustingRadius = true;
          circle.setRadius(maxRadius);
          isAdjustingRadius = false;
        }
      }
    }, 50); // Controlla ogni 50ms per una risposta fluida
    
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(newCircle) {
      // Rimuovi cerchio precedente se esiste
      if (circle) {
        circle.setMap(null); // setMap(null) cancella il cerchio dalla mappa
      }
      circle = newCircle;
      
      // Limita il raggio subito dopo il disegno se supera il massimo
      if (circle.getRadius() > maxRadius) {
        isAdjustingRadius = true;
        circle.setRadius(maxRadius);
        isAdjustingRadius = false;
      }
      
      // Aggiungi listener per quando l'utente modifica il cerchio (sposta o cambia raggio)
      circle.addListener('radius_changed', () => { 
        // Evita loop infiniti quando limitiamo il raggio
        if (isAdjustingRadius) return;
        
        // Vincolo: il raggio non può superare 10 km (10.000 metri)
        if (circle.getRadius() > maxRadius) {
          isAdjustingRadius = true;
          circle.setRadius(maxRadius);
          isAdjustingRadius = false;
          return; // Esci senza ricercare
        }
        updateCircleInfo(circle);    // Aggiorna i numeri nella sidebar
        searchPlaces(circle);         // Effettua nuova ricerca
      });
      circle.addListener('center_changed', () => { 
        updateCircleInfo(circle);
        searchPlaces(circle);
      });
      
      // Esegui la ricerca iniziale non appena il cerchio è completo (con raggio limitato)
      updateCircleInfo(circle);
      searchPlaces(circle);
    });

    // ===== EVENT LISTENER: BOTTONE "RIMUOVI CERCHIO" =====
    /**
     * Quando l'utente clicca "Rimuovi cerchio":
     * 1. Cancella il cerchio dalla mappa
     * 2. Rimuove tutti i marker
     * 3. Svuota la lista di ristoranti nella sidebar
     * 4. Resetta le info (coordinate e raggio)
     */
    clearBtn.addEventListener('click', () => {
      if (circle) { 
        circle.setMap(null);           // Cancella il cerchio
        circle = null; 
      }
      clearMarkers();                  // Rimuovi tutti i marker
      placesListEl.innerHTML = '';     // Svuota la lista HTML
      
      // Resetta i valori nella sidebar
      if (coordsEl) coordsEl.innerText = '—';
      if (radiusEl) radiusEl.innerText = '—';
      lastPlaces = [];
    });

    // ===== EVENT LISTENER: BOTTONE "RICERCA DI NUOVO" =====
    /**
     * Quando l'utente clicca "Ricerca di nuovo":
     * Se c'è un cerchio disegnato, ricalcola i risultati della ricerca
     * Altrimenti, mostra un messaggio di avviso
     */
    const refreshBtn = document.getElementById('refresh-search');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
      if (!circle) {
        alert('Disegna prima un cerchio sulla mappa');
        return;
      }
      searchPlaces(circle); // Ricerca nuovi risultati con il cerchio attuale
    });

    // ===== EVENT LISTENER: BOTTONE "RICARICA MAPPA" =====
    /**
     * Ricarica tutta la pagina per resettare la mappa
     * Utile se Google Maps non carica correttamente
     */
    const reloadBtn = document.getElementById('reload-map');
    if (reloadBtn) reloadBtn.addEventListener('click', () => {
      location.reload();
    });

    // ===== EVENT LISTENER: BOTTONE "ESPORTA JSON" =====
    /**
     * Esporta la lista dei ristoranti trovati come file JSON
     * 
     * Processo:
     * 1. Prendi gli ultimi risultati (lastPlaces)
     * 2. Estrai solo i dati importanti (nome, indirizzo, coordinate, valutazione)
     * 3. Crea un oggetto Blob JSON
     * 4. Crea un link di download e scarica il file
     */
    const exportBtn = document.getElementById('export-json');
    if (exportBtn) exportBtn.disabled = true; // Disabilita finché non ci sono risultati
    if (exportBtn) exportBtn.addEventListener('click', () => {
      if (!lastPlaces || lastPlaces.length === 0) {
        alert('Nessun cibo da esportare. Disegna prima un cerchio e attendi i risultati.');
        return;
      }
      
      // Trasforma i dati in un formato leggibile
      const data = lastPlaces.map(p => {
        // I dati possono arrivare in diversi formati (con metodi lat/lng oppure proprietà dirette)
        // Prova a estrarre le coordinate in tutti i modi possibili
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
      
      // Crea il file JSON e lo scarica
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ristoranti.json';
      a.click();
      URL.revokeObjectURL(url); // Libera la memoria
    });

    // ===== FUNZIONE PRINCIPALE: RICERCA RISTORANTI =====
    /**
     * searchPlaces(circle) - Ricerca ristoranti nel raggio specificato dal cerchio
     * 
     * Processo:
     * 1. Cancella i marker e la lista precedenti
     * 2. Estrae il centro e il raggio del cerchio
     * 3. Invia 6 richieste parallele al server (/api/places/searchNearby) con configurazioni diverse
     * 4. Raggruppa i risultati per ricerca e li mostra organizzati nella sidebar
     * 5. Aggiorna lo stato nella sidebar
     */
    async function searchPlaces(circle) {
      clearMarkers();                        // Rimuovi tutti i marker precedenti
      placesListEl.innerHTML = '';           // Svuota la lista
      lastPlaces = [];                       // Resetta i risultati
      
      const center = circle.getCenter();
      const radius = Math.round(circle.getRadius());

      // Log per debugging (optional, vedi la console)
      const centerLatLng = {lat: center.lat(), lng: center.lng()};
      console.log('Searching restaurants for:', centerLatLng, 'radius:', radius);

      try {
        // ===== 6 RICHIESTE PARALLELE AL SERVER =====
        /**
         * Ottieni le configurazioni per le 6 ricerche e invia tutte le richieste in parallelo
         * Promise.all aspetta che tutte le 6 ricerche siano completate
         */
        const searchConfigs = getSearchConfigs();
        const searchPromises = searchConfigs.map(config => {
          const payload = { 
            lat: center.lat(), 
            lng: center.lng(), 
            radius,
            includedTypes: config.includedTypes,
            excludedTypes: config.excludedTypes,
            rankPreference: "POPULARITY"
          };
          
          console.log(`Ricerca ${config.searchNumber}:`, payload);
          
          return fetch('/api/places/searchNearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(response => response.json())
          .then(json => ({ searchNumber: config.searchNumber, data: json }))
          .catch(err => ({ searchNumber: config.searchNumber, error: err.message }));
        });

        // Esegui tutte le 6 ricerche in parallelo
        const allResults = await Promise.all(searchPromises);
        
        // ===== MOSTRA LE RISPOSTE JSON COMPLETE =====
        if (apiResponseEl && apiResponseTextEl) {
          apiResponseTextEl.innerText = JSON.stringify(allResults, null, 2);
          apiResponseEl.style.display = 'block';
        }

        // ===== RAGGRUPPAMENTO RISULTATI PER RICERCA =====
        /**
         * Organizza i risultati in gruppi, uno per ogni ricerca
         * Formato: { searchNumber: 1, count: 5, places: [...] }
         */
        const groupedResults = {};
        let totalResults = 0;
        
        allResults.forEach(result => {
          if (result.error) {
            console.error(`Ricerca ${result.searchNumber} fallita:`, result.error);
            groupedResults[result.searchNumber] = { searchNumber: result.searchNumber, count: 0, places: [], error: result.error };
            return;
          }
          
          const json = result.data;
          if (!json.ok) {
            console.error(`Ricerca ${result.searchNumber} fallita:`, json.error);
            groupedResults[result.searchNumber] = { searchNumber: result.searchNumber, count: 0, places: [], error: json.error };
            return;
          }

          const data = json.data || {};
          const results = data.places || [];
          const places = [];
          
          results.forEach((place) => {
            // La risposta v1 ha coordinate in location.latitude e location.longitude
            let latLng = null;
            if (place.location && place.location.latitude !== undefined && place.location.longitude !== undefined) {
              latLng = { lat: place.location.latitude, lng: place.location.longitude };
            }
            
            // Se non trovi coordinate, salta questo luogo
            if (!latLng) return;
            
            // Normalizza i dati in un formato coerente
            const displayNameValue = typeof place.displayName === 'object' && place.displayName.text 
              ? place.displayName.text 
              : place.displayName;
            
            const simplified = {
              name: displayNameValue || 'Sconosciuto',
              vicinity: place.formattedAddress || '',
              place_id: place.id || null,
              geometry: { location: { lat: latLng.lat, lng: latLng.lng } },
              types: place.types || [],
              searchSource: `Ricerca ${result.searchNumber}`  // Traccia quale ricerca ha trovato questo luogo
            };
            
            // Aggiungi il marker sulla mappa
            addPlaceMarker(simplified);
            
            // Salva nei risultati (per esportazione)
            lastPlaces.push(simplified);
            places.push(simplified);
            totalResults++;
          });
          
          groupedResults[result.searchNumber] = { 
            searchNumber: result.searchNumber, 
            count: places.length, 
            places 
          };
        });

        // ===== FILTRO AUTOMATICO DEI DUPLICATI =====
        // Filtra lastPlaces per mantenere solo il primo occurrence di ogni place_id
        const seen = new Set();
        const uniquePlaces = [];
        lastPlaces.forEach(place => {
          if (!seen.has(place.place_id)) {
            seen.add(place.place_id);
            uniquePlaces.push(place);
          }
        });
        lastPlaces = uniquePlaces;

        // ===== RENDERING SIDEBAR CON RISULTATI RAGGRUPPATI (SENZA DUPLICATI) =====
        // Se non ci sono risultati dopo il filtro
        if (lastPlaces.length === 0) {
          const li = document.createElement('li');
          li.className = 'place-item';
          li.style.padding = '10px';
          li.style.fontStyle = 'italic';
          li.textContent = 'Nessun risultato trovato in quest\'area.';
          placesListEl.appendChild(li);
          if (typeof window.setMapStatus === 'function') window.setMapStatus('Nessun risultato trovato');
          return;
        }

        // Raggruppa per ricerca
        const groupedBySearch = {};
        lastPlaces.forEach(place => {
          const searchNum = place.searchSource ? place.searchSource.match(/\d+/)[0] : '?';
          if (!groupedBySearch[searchNum]) {
            groupedBySearch[searchNum] = [];
          }
          groupedBySearch[searchNum].push(place);
        });

        // Mostra raggruppato senza duplicati
        for (let i = 1; i <= 6; i++) {
          const places = groupedBySearch[i] || [];
          
          const header = document.createElement('li');
          header.className = 'search-section-header';
          header.style.backgroundColor = '#f0f0f0';
          header.style.padding = '8px';
          header.style.fontWeight = 'bold';
          header.style.marginTop = '8px';
          header.style.cursor = 'default';
          header.style.borderLeft = '4px solid ' + getSearchColor(i);
          header.style.listStyle = 'none';
          header.textContent = `Ricerca ${i}: ${places.length} risultato${places.length !== 1 ? 'i' : ''}`;
          placesListEl.appendChild(header);
          
          if (places.length > 0) {
            places.forEach(place => {
              addPlaceToList(place, null);
            });
          } else {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'place-item';
            emptyItem.style.fontSize = '0.9rem';
            emptyItem.style.color = '#999';
            emptyItem.style.paddingLeft = '20px';
            emptyItem.textContent = '(nessun risultato)';
            placesListEl.appendChild(emptyItem);
          }
        }

        // Aggiorna il contatore nella sidebar
        if (typeof window.setMapStatus === 'function') 
          window.setMapStatus(`Trovati ${lastPlaces.length} risultati unici`);
        
        // Abilita il bottone di esportazione ora che abbiamo risultati
        if (exportBtn) exportBtn.disabled = false;
        
        // Controlla e mostra i duplicati nella pagina (analisi)
        checkDuplicates();
        
      } catch (err) {
        // Gestisci errori di rete o parsing
        console.error('Search failed', err);
        const li = document.createElement('li');
        li.className = 'place-item';
        li.textContent = `Ricerca fallita: ${err.message}`;
        //placesListEl.appendChild(li);
      }
    }

    // ===== FUNZIONE HELPER: COLORE DELLA RICERCA =====
    /**
     * Restituisce il colore associato a ogni ricerca per identificarla visivamente
     * I colori sono definiti in DEFAULT_SEARCHES
     */
    function getSearchColor(searchNumber) {
      const search = DEFAULT_SEARCHES[searchNumber - 1];
      return search ? search.color : '#999';
    }

    // ===== FUNZIONE: AGGIORNA INFO CERCHIO =====
    /**
     * updateCircleInfo(circle) - Aggiorna le coordinate e il raggio mostrati nella sidebar
     */
    function updateCircleInfo(circle) {
      if (!circle) return;
      const center = circle.getCenter();
      const radius = Math.round(circle.getRadius());
      
      // Mostra le coordinate con 6 decimali (precisione di ~0.1 metri)
      if (coordsEl) coordsEl.innerText = `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}`;
      // Mostra il raggio arrotondato in metri
      if (radiusEl) radiusEl.innerText = radius.toString();
    }

    // ===== FUNZIONE HELPER: CREA ICONA MARKER COLORATA =====
    /**
     * createColoredMarkerIcon(color) - Crea un'icona SVG per il marker con il colore specificato
     */
    function createColoredMarkerIcon(color) {
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <path fill="${color}" stroke="white" stroke-width="2" d="M16 0C9.4 0 4 5.4 4 12c0 7 12 20 12 20s12-13 12-20c0-6.6-5.4-12-12-12z"/>
          <circle cx="16" cy="12" r="5" fill="white"/>
        </svg>
      `.trim();
      
      return {
        url: 'data:image/svg+xml;base64,' + btoa(svgIcon),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      };
    }

    // ===== FUNZIONE: AGGIUNGI MARKER SULLA MAPPA =====
    /**
     * addPlaceMarker(place) - Crea un marker sulla mappa per un ristorante
     * 
     * Funzionalità:
     * 1. Crea un marker a quella posizione con icona colorata
     * 2. Al click mostra nome e indirizzo in una InfoWindow
     * 3. Il colore corrisponde alla categoria di ricerca
     */
    function addPlaceMarker(place) {
      if (!place.geometry || !place.geometry.location) return;
      
      // Estrai il numero della ricerca da searchSource e ottieni il colore
      let markerColor = '#1f76d2'; // blu di default
      if (place.searchSource) {
        const searchNum = place.searchSource.match(/\d+/);
        if (searchNum) {
          markerColor = getSearchColor(parseInt(searchNum[0]));
        }
      }
      
      // Crea il marker sulla mappa con icona colorata
      const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        icon: createColoredMarkerIcon(markerColor),
        title: place.name
      });
      markers.push(marker); // Salva il riferimento per poterlo cancellare dopo

      // Quando clicchi il marker, mostra un popup con il nome, indirizzo e tipi
      google.maps.event.addListener(marker, 'click', () => {
        let content = '<div><strong>' + escapeHtml(place.name) + '</strong><br>';
        
        // Aggiungi indirizzo se disponibile
        if (place.vicinity) {
          content += '<small>' + escapeHtml(place.vicinity) + '</small><br>';
        }
        
        // Aggiungi i tipi assegnati da Google Maps
        if (place.types && place.types.length > 0) {
          content += '<small style="color: #666; margin-top: 8px; display: block;"><strong>Tipi:</strong> ' + 
                     escapeHtml(place.types.join(', ')) + 
                     '</small>';
        }
        
        // Aggiungi la fonte della ricerca
        if (place.searchSource) {
          content += '<small style="color: #999; margin-top: 5px; display: block; font-style: italic;">Fonte: ' + 
                     escapeHtml(place.searchSource) + 
                     '</small>';
        }
        
        content += '</div>';
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });
    }

    // ===== FUNZIONE: AGGIUNGI RISTORANTE ALLA LISTA SIDEBAR =====
    /**
     * addPlaceToList(place, marker) - Aggiunge un elemento <li> con il ristorante
     * 
     * Funzionalità:
     * 1. Crea un <li> con nome e indirizzo
     * 2. Al click: centra la mappa su quel punto, zoom in, apre la InfoWindow del marker
     */
    function addPlaceToList(place, marker) {
      const el = document.createElement('li');
      el.className = 'place-item';
      el.tabIndex = 0; // Rendi focusabile per accessibilità da tastiera
      el.style.paddingLeft = '15px'; // Indentazione per distinguere dai header
      
      // Mostra nome e indirizzo, usando escapeHtml per evitare XSS
      el.innerHTML = `<strong>${escapeHtml(place.name)}</strong><br/><small>${escapeHtml(place.vicinity || '')}</small>`;
      
      // Quando clicchi un ristorante nella lista:
      el.addEventListener('click', () => {
        map.panTo(place.geometry.location);      // Centra la mappa su quel punto
        map.setZoom(16);                         // Zoom in al livello 16
        
        // Se marker è null, cerca il marker che corrisponde a questo place
        if (!marker) {
          marker = markers.find(m => 
            m.getPosition().lat() === place.geometry.location.lat &&
            m.getPosition().lng() === place.geometry.location.lng
          );
        }
        
        // Se trovi il marker, apri la InfoWindow
        if (marker) {
          google.maps.event.trigger(marker, 'click');
        }
      });
      
      placesListEl.appendChild(el);
    }

    // ===== FUNZIONE: CANCELLA TUTTI I MARKER =====
    /**
     * clearMarkers() - Rimuove tutti i marker dalla mappa
     * Usata quando si cancella il cerchio o si fa una nuova ricerca
     */
    function clearMarkers() {
      markers.forEach(m => m.setMap(null)); // setMap(null) rimuove il marker dalla mappa
      markers = []; // Resetta l'array
    }



    // ===== FUNZIONE: CONTROLLA DUPLICATI =====
    /**
     * checkDuplicates() - Verifica se ci sono duplicati in lastPlaces basato su place_id
     * 
     * Restituisce un oggetto con:
     *   - hasDuplicates: boolean (true se ci sono duplicati)
     *   - count: numero totale di elementi
     *   - uniqueCount: numero di elementi unici
     *   - duplicates: array con i place_id che compaiono più volte
     *   - duplicateDetails: oggetto con dettagli per ogni duplicato
     */
    function checkDuplicates() {
      const seen = {}; // { place_id: count }
      const duplicateIds = new Set();
      
      // Conta quante volte appare ogni place_id
      lastPlaces.forEach(place => {
        const id = place.place_id;
        if (id) {
          seen[id] = (seen[id] || 0) + 1;
          if (seen[id] > 1) {
            duplicateIds.add(id);
          }
        }
      });
      
      // Crea dettagli dei duplicati
      const duplicateDetails = {};
      duplicateIds.forEach(id => {
        duplicateDetails[id] = {
          count: seen[id],
          places: lastPlaces.filter(p => p.place_id === id).map(p => ({
            name: p.name,
            searchSource: p.searchSource
          }))
        };
      });
      
      const hasDuplicates = duplicateIds.size > 0;
      const uniqueCount = Object.keys(seen).length;
      
      const result = {
        hasDuplicates,
        count: lastPlaces.length,
        uniqueCount,
        duplicates: Array.from(duplicateIds),
        duplicateDetails,
        // Funzione helper per stampa in console
        log: function() {
          console.log('=== ANALISI DUPLICATI ===');
          console.log(`Totale elementi: ${this.count}`);
          console.log(`Elementi unici: ${this.uniqueCount}`);
          console.log(`Duplicati trovati: ${this.duplicates.length}`);
          if (this.hasDuplicates) {
            console.log('Dettagli duplicati:');
            this.duplicates.forEach(id => {
              console.log(`  [${id}] - ${this.duplicateDetails[id].count} occorrenze`);
              this.duplicateDetails[id].places.forEach(p => {
                console.log(`    → ${p.name} (${p.searchSource})`);
              });
            });
          } else {
            console.log('✅ Nessun duplicato trovato!');
          }
        }
      };
      
      // ===== MOSTRA RISULTATI NELLA PAGINA =====
      const duplicatesInfoEl = document.getElementById('duplicates-info');
      const duplicatesContentEl = document.getElementById('duplicates-content');
      
      if (duplicatesInfoEl && duplicatesContentEl) {
        if (hasDuplicates) {
          // Mostra il box dei duplicati
          duplicatesInfoEl.style.display = 'block';
          
          // Costruisci il contenuto HTML
          let html = `<strong>Trovati ${result.duplicates.length} ${result.duplicates.length === 1 ? 'luogo' : 'luoghi'} ${result.duplicates.length === 1 ? 'duplicato' : 'duplicati'}:</strong><br>`;
          html += `<small style="color: #666;">Totale: ${result.count} | Unici: ${result.uniqueCount}</small><br><br>`;
          
          result.duplicates.forEach(id => {
            const detail = result.duplicateDetails[id];
            html += `<div style="margin-bottom: 8px; padding: 5px; background: #fff; border-radius: 3px; border-left: 3px solid #ff9800;">`;
            html += `<strong>${escapeHtml(detail.places[0].name)}</strong><br>`;
            html += `<small style="color: #999;">${detail.count} occorrenze:</small><br>`;
            detail.places.forEach(p => {
              html += `<small style="display: block; color: #666; margin-left: 10px;">• ${escapeHtml(p.searchSource)}</small>`;
            });
            html += `</div>`;
          });
          
          duplicatesContentEl.innerHTML = html;
        } else {
          // Nascondi il box se non ci sono duplicati
          duplicatesInfoEl.style.display = 'none';
        }
      }
      
      return result;
    }

    // Esponi la funzione globalmente per il debugging
    if (typeof window !== 'undefined') window.checkDuplicates = checkDuplicates;

    // ===== FUNZIONE HELPER: ESCAPE HTML =====
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

    // ===== FUNZIONE HELPER: AGGIORNA STATO MAPPA =====
    /**
     * setMapStatus(message) - Aggiorna il testo dello stato nella sidebar
     * Se il messaggio contiene "errore", mostra anche un overlay con i dettagli
     */
    function setMapStatus(message) {
      if (mapStatusText) mapStatusText.innerText = message;
      const overlay = document.getElementById('map-overlay');
      if (overlay && message && message.toLowerCase().includes('errore')) 
        overlay.style.display = 'flex'; // Mostra overlay di errore
    }

    // Esponi la funzione globalmente così può essere chiamata da altre parti
    if (typeof window !== 'undefined') window.setMapStatus = setMapStatus;

  } catch (err) {
    // Gestisci errori che accadono durante l'inizializzazione della mappa
    console.error('Errore durante initMap:', err);
    showMapErrorOverlay('Si è verificato un errore durante l\'inizializzazione della mappa. Controlla la console per dettagli.');
    if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: initMap');
  }
}

// Esponi initMap al scope globale così Google Maps può chiamarla come callback
window.initMap = initMap;

// ===== GESTIONE ERRORI GOOGLE MAPS API =====

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

/**
 * window.mapLoadError - Callback per quando lo script Google Maps non carica
 * Questo è richiamato dall'attributo onerror nello script tag in index.ejs
 */
window.mapLoadError = function() {
  const msg = 'Impossibile caricare il Google Maps JS (script). Controlla la connessione e la chiave API.';
  showMapErrorOverlay(msg);
  if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: script non caricato');
  console.error(msg);
};

/**
 * window.gm_authFailure - Callback globale per autenticazione Google Maps fallita
 * Scattata quando la chiave API è invalida, scaduta, o ha restrizioni geografiche
 */
window.gm_authFailure = function() {
  const msg = 'Autenticazione Google Maps fallita: la chiave API potrebbe essere invalida o con restrizioni. Controlla la console e le impostazioni nella Google Cloud Console.';
  showMapErrorOverlay(msg);
  if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: Autenticazione fallita');
};

/**
 * Timeout check - Se Google Maps non carica entro 4 secondi, mostra errore
 * Utile per connessioni molto lente o per rilevare quando il caricamento fallisce silenziosamente
 */
setTimeout(() => {
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    const msg = 'Google Maps JS non è stato caricato (timeout). Controlla la chiave API e la connessione.';
    showMapErrorOverlay(msg);
    if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: API non caricata');
  }
}, 4000); // Attendi 4 secondi prima di segnalare errore
