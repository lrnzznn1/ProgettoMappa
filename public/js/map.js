// map.js - initialize a Google Map
function initMap() {
  try {
  const center = { lat: 41.9028, lng: 12.4964 }; // Rome by default
  const map = new google.maps.Map(document.getElementById('map'), {
    center,
    zoom: 13,
    // disable default UI for a cleaner look; can be changed
    mapTypeControl: false,
  });

  const placesListEl = document.getElementById('places-list');
  const clearBtn = document.getElementById('clear-circle');
  let circle = null;
  let markers = [];
  let lastPlaces = [];
  let placesService = new google.maps.places.PlacesService(map);
  let infoWindow = new google.maps.InfoWindow();
  const coordsEl = document.getElementById('circle-coords');
  const radiusEl = document.getElementById('circle-radius');
  const mapStatusText = document.getElementById('map-status-text');

  // Drawing Manager to let user draw a circle
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

  // Update status and hide placeholder/dev overlays
  if (mapStatusText) mapStatusText.innerText = 'Caricata con successo ✅';
  const placeholder = document.getElementById('map-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  // hide overlay if previously shown
  const overlayEl = document.getElementById('map-overlay');
  if (overlayEl) overlayEl.style.display = 'none';

  // When a circle is completed, remove previous one and perform search
  google.maps.event.addListener(drawingManager, 'circlecomplete', function(newCircle) {
    // remove any existing circle
    if (circle) {
      circle.setMap(null);
    }
    circle = newCircle;
    // Listen to edits and re-search
    circle.addListener('radius_changed', () => { updateCircleInfo(circle); searchPlaces(circle); });
    circle.addListener('center_changed', () => { updateCircleInfo(circle); searchPlaces(circle); });
    // perform initial search
    updateCircleInfo(circle);
    searchPlaces(circle);
  });

  // clear circle - remove markers and list
  clearBtn.addEventListener('click', () => {
    if (circle) { circle.setMap(null); circle = null; }
    clearMarkers();
    placesListEl.innerHTML = '';
    // clear circle info
    if (coordsEl) coordsEl.innerText = '—';
    if (radiusEl) radiusEl.innerText = '—';
    lastPlaces = [];
  });

  // reload button behavior
  const reloadBtn = document.getElementById('reload-map');
  if (reloadBtn) reloadBtn.addEventListener('click', () => {
    // reload page to attempt fresh API load
    location.reload();
  });

  // Export JSON button
  const exportBtn = document.getElementById('export-json');
  if (exportBtn) exportBtn.disabled = true;
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!lastPlaces || lastPlaces.length === 0) {
      alert('Nessun ristorante da esportare. Disegna prima un cerchio e attendi i risultati.');
      return;
    }
    const data = lastPlaces.map(p => {
      const latVal = (p.geometry && p.geometry.location && typeof p.geometry.location.lat === 'function') ? p.geometry.location.lat() : (p.geometry && p.geometry.location && p.geometry.location.lat !== undefined) ? p.geometry.location.lat : (p.geometry && p.geometry.location && p.geometry.location.latitude) ? p.geometry.location.latitude : null;
      const lngVal = (p.geometry && p.geometry.location && typeof p.geometry.location.lng === 'function') ? p.geometry.location.lng() : (p.geometry && p.geometry.location && p.geometry.location.lng !== undefined) ? p.geometry.location.lng : (p.geometry && p.geometry.location && p.geometry.location.longitude) ? p.geometry.location.longitude : null;
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

  async function searchPlaces(circle) {
    clearMarkers();
    placesListEl.innerHTML = '';
    lastPlaces = [];
    const center = circle.getCenter();
    const radius = Math.round(circle.getRadius());

    // Show lat/lng and radius for debugging (optional)
    const centerLatLng = {lat: center.lat(), lng: center.lng()};
    console.log('Searching restaurants for:', centerLatLng, 'radius:', radius);

    // Server-side Places search to avoid client-side limitations
    try {
      const payload = { lat: center.lat(), lng: center.lng(), radius };
      const response = await fetch('/api/places/searchNearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!json.ok) {
        const li = document.createElement('li');
        li.className = 'place-item';
        li.textContent = `Ricerca fallita: ${json.error || 'errore sconosciuto'}`;
        placesListEl.appendChild(li);
        return;
      }

      const data = json.data || {};
      const results = data.results || [];
      if (!results || results.length === 0) {
        const li = document.createElement('li');
        li.className = 'place-item';
        li.textContent = 'Nessun ristorante trovato in quest\'area.';
        placesListEl.appendChild(li);
        if (typeof window.setMapStatus === 'function') window.setMapStatus('Nessun ristorante trovato');
        return;
      }

      results.forEach((r) => {
        // r may have a `.place` wrapper or be a direct place object
        const place = r.place || r;
        // possible geometry paths
        let latLng = null;
        if (place.location && place.location.lat && place.location.lng) {
          latLng = { lat: place.location.lat, lng: place.location.lng };
        } else if (place.geometry && place.geometry.location) {
          // place.geometry.location may be {lat,lng}
          latLng = { lat: place.geometry.location.lat, lng: place.geometry.location.lng };
        } else if (place.geo && place.geo.location && place.geo.location.lat && place.geo.location.lng) {
          latLng = { lat: place.geo.location.lat, lng: place.geo.location.lng };
        }
        // If no location, skip
        if (!latLng) return;
        const simplified = {
          name: place.displayName || place.name || (place.info && place.info.name) || 'Sconosciuto',
          vicinity: place.address || place.formatted_address || (place.locality || ''),
          place_id: place.place_id || place.id || null,
          geometry: { location: { lat: latLng.lat, lng: latLng.lng } },
        };
        addPlaceMarker(simplified);
        lastPlaces.push(simplified);
        if (typeof window.setMapStatus === 'function') window.setMapStatus(`Trovati ${lastPlaces.length} ristoranti`);
        // enable export button
        if (exportBtn) exportBtn.disabled = false;
      });
    } catch (err) {
      console.error('Server-side search failed', err);
      const li = document.createElement('li');
      li.className = 'place-item';
      li.textContent = `Ricerca fallita: ${err.message}`;
      placesListEl.appendChild(li);
    }
    // Note: server doesn't include pagination token handling; can be improved later
  }

  // Expose a local function for display errors
  function setMapStatus(message) {
    if (mapStatusText) mapStatusText.innerText = message;
    const overlay = document.getElementById('map-overlay');
    if (overlay && message && message.toLowerCase().includes('errore')) overlay.style.display = 'flex';
  }

  // expose global setter so external handlers can update status
  if (typeof window !== 'undefined') window.setMapStatus = setMapStatus;

  function updateCircleInfo(circle) {
    if (!circle) return;
    const center = circle.getCenter();
    const radius = Math.round(circle.getRadius());
    if (coordsEl) coordsEl.innerText = `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}`;
    if (radiusEl) radiusEl.innerText = radius.toString();
  }

  function addPlaceMarker(place) {
    if (!place.geometry || !place.geometry.location) return;
    const marker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
    });
    markers.push(marker);

    google.maps.event.addListener(marker, 'click', () => {
      infoWindow.setContent('<div><strong>' + place.name + '</strong><br>' + (place.vicinity || '') + '</div>');
      infoWindow.open(map, marker);
    });

    // Add to sidebar
    addPlaceToList(place, marker);
  }

  function addPlaceToList(place, marker) {
    const el = document.createElement('li');
    el.className = 'place-item';
    el.tabIndex = 0;
    el.innerHTML = `<strong>${escapeHtml(place.name)}</strong><br/><small>${escapeHtml(place.vicinity || '')}</small>`;
    el.addEventListener('click', () => {
      map.panTo(place.geometry.location);
      map.setZoom(16);
      google.maps.event.trigger(marker, 'click');
    });
    placesListEl.appendChild(el);
  }

  function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
  }

  // Small helper to escape HTML when injecting into list
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
  } catch (err) {
      console.error('Errore durante initMap:', err);
      // show user-facing overlay/message
      showMapErrorOverlay('Si è verificato un errore durante l\'inizializzazione della mappa. Controlla la console per dettagli.');
      if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: initMap');
    }
}

// Expose initMap to the global scope for callback
window.initMap = initMap;

// If the Google Maps API fails to load, show a helpful overlay
function showMapErrorOverlay(msg) {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  if (msg) {
    const target = overlay.querySelector('.overlay-content p');
    if (target) target.innerText = msg;
  }
}

// If the script tag fails to load, this will be called from the `onerror` attribute
window.mapLoadError = function() {
  const msg = 'Impossibile caricare il Google Maps JS (script). Controlla la connessione e la chiave API.';
  showMapErrorOverlay(msg);
  if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: script non caricato');
  console.error(msg);
};

// Global callback for Maps API auth failure (invalid key, restrictions, etc.)
window.gm_authFailure = function() {
  const msg = 'Autenticazione Google Maps fallita: la chiave API potrebbe essere invalida o con restrizioni. Controlla la console e le impostazioni nella Google Cloud Console.';
  showMapErrorOverlay(msg);
  if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: Autenticazione fallita');
};

// If google isn't defined after a short timeout, the API probably failed to load
setTimeout(() => {
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    const msg = 'Google Maps JS non è stato caricato (timeout). Controlla la chiave API e la connessione.';
    showMapErrorOverlay(msg);
    if (typeof window.setMapStatus === 'function') window.setMapStatus('Errore: API non caricata');
  }
}, 4000); // increase timeout to 4s to accommodate slow networks
