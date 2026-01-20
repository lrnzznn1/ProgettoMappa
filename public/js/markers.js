/**
 * markers.js - Gestione marker e InfoWindow sulla mappa
 */

// ===== GESTIONE MARKER =====

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

/**
 * addPlaceMarker(place, map, markers, infoWindow) - Crea un marker sulla mappa per un ristorante
 * 
 * Funzionalità:
 * 1. Crea un marker a quella posizione con icona colorata
 * 2. Al click mostra nome e indirizzo in una InfoWindow
 * 3. Il colore corrisponde alla categoria di ricerca
 */
function addPlaceMarker(place, map, markers, infoWindow) {
  if (!place.geometry || !place.geometry.location) return;
  
  // Estrai il numero della ricerca da searchSource e ottieni il colore
  let markerColor = '#1f76d2'; // blu di default
  if (place.searchSource) {
    const searchNum = place.searchSource.match(/\d+/);
    if (searchNum) {
      const numSearch = parseInt(searchNum[0]);
      // I marker delle ricerche 1-4 sono sempre rossi
      if (numSearch >= 1 && numSearch <= 4) {
        markerColor = '#d32f2f'; // Rosso per ricerche 1-4
      } else {
        markerColor = getSearchColor(numSearch);
      }
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

/**
 * clearMarkers(markers) - Rimuove tutti i marker dalla mappa
 * Usata quando si cancella il cerchio o si fa una nuova ricerca
 */
function clearMarkers(markers) {
  markers.forEach(m => m.setMap(null)); // setMap(null) rimuove il marker dalla mappa
  markers.length = 0; // Resetta l'array mantenendo il riferimento
}

/**
 * addPlaceToList(place, markers, map) - Aggiunge un elemento <li> con il ristorante
 * 
 * Funzionalità:
 * 1. Crea un <li> con nome e indirizzo
 * 2. Al click: centra la mappa su quel punto, zoom in, apre la InfoWindow del marker
 */
function addPlaceToList(place, markers, map) {
  const placesListEl = document.getElementById('places-list');
  if (!placesListEl) return;
  
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
    
    // Cerca il marker che corrisponde a questo place
    const marker = markers.find(m => 
      m.getPosition().lat() === place.geometry.location.lat &&
      m.getPosition().lng() === place.geometry.location.lng
    );
    
    // Se trovi il marker, apri la InfoWindow
    if (marker) {
      google.maps.event.trigger(marker, 'click');
    }
  });
  
  placesListEl.appendChild(el);
}