/**
 * map.js - Inizializzazione mappa Google Maps e logica di ricerca ristoranti
 * 
 * Questa funzione è il cuore dell'app lato client:
 * 1. Crea una mappa Google Maps centrata su Roma
 * 2. Permette all'utente di disegnare un cerchio sulla mappa
 * 3. Quando il cerchio è completato/modificato, cerca ristoranti via API server
 * 4. Mostra i risultati come marker sulla mappa e come lista nella sidebar
 */
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
    const placesListEl = document.getElementById('places-list'); // Lista ristoranti nella sidebar
    const clearBtn = document.getElementById('clear-circle');    // Bottone per cancellare il cerchio
    let circle = null;                                           // Variabile che tiene traccia del cerchio disegnato
    let markers = [];                                            // Array di marker sulla mappa
    let lastPlaces = [];                                         // Ultimi risultati di ricerca (per esportazione)
    let placesService = new google.maps.places.PlacesService(map);
    let infoWindow = new google.maps.InfoWindow();              // Finestra che appare al click su un marker
    const coordsEl = document.getElementById('circle-coords');  // Span che mostra le coordinate del cerchio
    const radiusEl = document.getElementById('circle-radius');  // Span che mostra il raggio del cerchio
    const mapStatusText = document.getElementById('map-status-text'); // Span che mostra lo stato della mappa

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
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(newCircle) {
      // Rimuovi cerchio precedente se esiste
      if (circle) {
        circle.setMap(null); // setMap(null) cancella il cerchio dalla mappa
      }
      circle = newCircle;
      
      // Aggiungi listener per quando l'utente modifica il cerchio (sposta o cambia raggio)
      circle.addListener('radius_changed', () => { 
        updateCircleInfo(circle);    // Aggiorna i numeri nella sidebar
        searchPlaces(circle);         // Effettua nuova ricerca
      });
      circle.addListener('center_changed', () => { 
        updateCircleInfo(circle);
        searchPlaces(circle);
      });
      
      // Esegui la ricerca iniziale non appena il cerchio è completo
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
        alert('Nessun ristorante da esportare. Disegna prima un cerchio e attendi i risultati.');
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
     * 3. Invia i dati al server via POST (/api/places/searchNearby)
     * 4. Riceve i risultati e crea marker + lista per ogni ristorante
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
        // ===== RICHIESTA AL SERVER =====
        /**
         * Invia le coordinate e il raggio al server
         * Il server utilizzerà Google Places API per cercare ristoranti
         */
        const payload = { lat: center.lat(), lng: center.lng(), radius };
        const response = await fetch('/api/places/searchNearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        
        // Controlla se la ricerca è andata a buon fine
        if (!json.ok) {
          const li = document.createElement('li');
          li.className = 'place-item';
          li.textContent = `Ricerca fallita: ${json.error || 'errore sconosciuto'}`;
          placesListEl.appendChild(li);
          return;
        }

        // ===== ELABORAZIONE RISULTATI =====
        const data = json.data || {};
        const results = data.results || [];
        
        // Se non ci sono risultati, mostra un messaggio
        if (!results || results.length === 0) {
          const li = document.createElement('li');
          li.className = 'place-item';
          li.textContent = 'Nessun ristorante trovato in quest\'area.';
          placesListEl.appendChild(li);
          if (typeof window.setMapStatus === 'function') window.setMapStatus('Nessun ristorante trovato');
          return;
        }

        // ===== PER OGNI RISTORANTE: CREA MARKER E VOCE LISTA =====
        results.forEach((r) => {
          // Alcuni risultati potrebbero avere un wrapper ".place", altri no
          const place = r.place || r;
          
          // Estrai le coordinate (possono essere in diversi formati)
          let latLng = null;
          if (place.location && place.location.lat && place.location.lng) {
            latLng = { lat: place.location.lat, lng: place.location.lng };
          } else if (place.geometry && place.geometry.location) {
            latLng = { lat: place.geometry.location.lat, lng: place.geometry.location.lng };
          } else if (place.geo && place.geo.location && place.geo.location.lat && place.geo.location.lng) {
            latLng = { lat: place.geo.location.lat, lng: place.geo.location.lng };
          }
          
          // Se non trovi coordinate, salta questo ristorante
          if (!latLng) return;
          
          // Normalizza i dati in un formato coerente
          const simplified = {
            name: place.displayName || place.name || (place.info && place.info.name) || 'Sconosciuto',
            vicinity: place.address || place.formatted_address || (place.locality || ''),
            place_id: place.place_id || place.id || null,
            geometry: { location: { lat: latLng.lat, lng: latLng.lng } },
          };
          
          // Aggiungi il marker sulla mappa
          addPlaceMarker(simplified);
          
          // Salva nei risultati (per esportazione)
          lastPlaces.push(simplified);
          
          // Aggiorna il contatore nella sidebar
          if (typeof window.setMapStatus === 'function') 
            window.setMapStatus(`Trovati ${lastPlaces.length} ristoranti`);
          
          // Abilita il bottone di esportazione ora che abbiamo risultati
          if (exportBtn) exportBtn.disabled = false;
        });
      } catch (err) {
        // Gestisci errori di rete o parsing
        console.error('Server-side search failed', err);
        const li = document.createElement('li');
        li.className = 'place-item';
        li.textContent = `Ricerca fallita: ${err.message}`;
        placesListEl.appendChild(li);
      }
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

    // ===== FUNZIONE: AGGIUNGI MARKER SULLA MAPPA =====
    /**
     * addPlaceMarker(place) - Crea un marker sulla mappa per un ristorante
     * 
     * Funzionalità:
     * 1. Crea un marker a quella posizione
     * 2. Al click mostra nome e indirizzo in una InfoWindow
     * 3. Aggiunge il ristorante alla lista nella sidebar
     */
    function addPlaceMarker(place) {
      if (!place.geometry || !place.geometry.location) return;
      
      // Crea il marker sulla mappa
      const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
      });
      markers.push(marker); // Salva il riferimento per poterlo cancellare dopo

      // Quando clicchi il marker, mostra un popup con il nome e indirizzo
      google.maps.event.addListener(marker, 'click', () => {
        infoWindow.setContent(
          '<div><strong>' + place.name + '</strong><br>' + (place.vicinity || '') + '</div>'
        );
        infoWindow.open(map, marker);
      });

      // Aggiungi anche il ristorante alla lista nella sidebar
      addPlaceToList(place, marker);
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
      
      // Mostra nome e indirizzo, usando escapeHtml per evitare XSS
      el.innerHTML = `<strong>${escapeHtml(place.name)}</strong><br/><small>${escapeHtml(place.vicinity || '')}</small>`;
      
      // Quando clicchi un ristorante nella lista:
      el.addEventListener('click', () => {
        map.panTo(place.geometry.location);      // Centra la mappa su quel punto
        map.setZoom(16);                         // Zoom in al livello 16
        google.maps.event.trigger(marker, 'click'); // Apri la InfoWindow del marker
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

    // ===== FUNZIONE HELPER: ESCAPE HTML =====
    /**
     * escapeHtml(unsafe) - Previene attacchi XSS sostituendo caratteri speciali
     * Esempio: <script> diventa &lt;script&gt;
     */
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe.replace(/[&<>"'`]/g, function (m) {
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
