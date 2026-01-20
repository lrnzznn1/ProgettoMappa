/**
 * markers.js - Gestione marker e InfoWindow sulla mappa
 */

// ===== GESTIONE MARKER =====

// Variabile globale per il filtro colore attivo
let activeColorFilter = 'all';

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
  
  // Aggiungi metadati per il filtraggio
  marker.searchColor = markerColor;
  marker.placeData = place;
  
  markers.push(marker); // Salva il riferimento per poterlo cancellare dopo

  // Quando clicchi il marker, mostra un popup con il nome, indirizzo e tipi
  google.maps.event.addListener(marker, 'click', () => {
    // Crea contenuto InfoWindow migliorato con stile moderno
    const rating = place.rating ? `⭐ ${place.rating}` : '';
    const types = place.types && place.types.length > 0 ? place.types.slice(0, 3).join(', ') : 'Informazioni non disponibili';
    
    let content = `
      <div style="
        font-family: 'Inter', sans-serif;
        max-width: 300px;
        padding: 16px;
        border-radius: 12px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        ">
          <h3 style="
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            flex: 1;
          ">${escapeHtml(place.name)}</h3>
          ${rating ? `<span style="
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            margin-left: 8px;
          ">${rating}</span>` : ''}
        </div>
    `;
    
    // Aggiungi indirizzo
    if (place.vicinity) {
      content += `
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 13px;
        ">
          <span style="margin-right: 6px;">📍</span>
          <span>${escapeHtml(place.vicinity)}</span>
        </div>
      `;
    }
    
    // Aggiungi categorie con stile pill
    if (place.types && place.types.length > 0) {
      content += `
        <div style="margin-bottom: 10px;">
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          ">
      `;
      place.types.slice(0, 3).forEach(type => {
        const typeColor = getTypeColor(type);
        content += `
          <span style="
            background: ${typeColor};
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            text-transform: capitalize;
          ">${escapeHtml(type.replace(/_/g, ' '))}</span>
        `;
      });
      content += '</div></div>';
    }
    
    // Aggiungi fonte ricerca
    if (place.searchSource) {
      content += `
        <div style="
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">
          <span style="margin-right: 4px;">🔍</span>
          Trovato tramite: ${escapeHtml(place.searchSource)}
        </div>
      `;
    }
    
    content += '</div>';
    
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
  });
}

// Funzione per ottenere il colore basato sul tipo di luogo
function getTypeColor(type) {
  const typeColors = {
    'restaurant': '#ef4444',
    'food': '#ef4444',
    'meal_takeaway': '#ef4444',
    'cafe': '#3b82f6',
    'bar': '#3b82f6',
    'night_club': '#8b5cf6',
    'tourist_attraction': '#10b981',
    'museum': '#7c3aed',
    'park': '#059669',
    'church': '#f59e0b',
    'historical': '#f59e0b',
    'shopping_mall': '#ec4899',
    'store': '#ec4899',
    'lodging': '#6366f1',
    'hospital': '#dc2626',
    'bank': '#374151',
    'gas_station': '#f97316'
  };

  // Cerca una corrispondenza nei colori predefiniti
  for (const [key, color] of Object.entries(typeColors)) {
    if (type.includes(key)) {
      return color;
    }
  }
  
  // Colore di default
  return '#6b7280';
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
 * Applica un filtro per colore ai marker
 * @param {string} color - Colore da mostrare ('all' per tutti, hex per colore specifico)
 * @param {Array} markers - Array dei marker
 */
function applyColorFilter(color, markers) {
  activeColorFilter = color;
  
  markers.forEach(marker => {
    const shouldShow = color === 'all' || marker.searchColor === color;
    marker.setVisible(shouldShow);
  });
  
  // Aggiorna anche la lista nella sidebar
  updatePlacesList();
}

/**
 * Aggiorna la lista dei posti nella sidebar in base al filtro attivo
 */
function updatePlacesList() {
  const listItems = document.querySelectorAll('.place-item');
  const sectionHeaders = document.querySelectorAll('.search-section-header');
  
  if (activeColorFilter === '#d32f2f') {
    // Per il filtro "Ristoranti", mostra solo risultati unici delle prime 4 ricerche
    const seenPlaces = new Set();
    
    listItems.forEach(item => {
      const markerColor = item.dataset.markerColor;
      const placeName = item.querySelector('strong')?.textContent || '';
      const placeAddress = item.querySelector('small')?.textContent || '';
      const placeKey = `${placeName}-${placeAddress}`;
      
      if (markerColor === '#d32f2f') {
        // È un ristorante delle prime 4 ricerche
        if (!seenPlaces.has(placeKey)) {
          seenPlaces.add(placeKey);
          item.style.display = 'block';
        } else {
          item.style.display = 'none'; // Nascondi duplicato
        }
      } else {
        item.style.display = 'none'; // Nascondi altri colori
      }
    });
    
    // Per gli header, mostra solo quelli delle prime 4 ricerche
    sectionHeaders.forEach(header => {
      const headerText = header.textContent || '';
      const isFirst4 = headerText.match(/Ricerca [1-4]:/);
      header.style.display = isFirst4 ? 'list-item' : 'none';
    });
  } else {
    // Logica normale per altri filtri
    listItems.forEach(item => {
      const markerColor = item.dataset.markerColor;
      if (markerColor) {
        const shouldShow = activeColorFilter === 'all' || markerColor === activeColorFilter;
        item.style.display = shouldShow ? 'block' : 'none';
      }
    });
    
    sectionHeaders.forEach(header => {
      const sectionColor = header.dataset.sectionColor;
      if (sectionColor) {
        const shouldShow = activeColorFilter === 'all' || sectionColor === activeColorFilter;
        header.style.display = shouldShow ? 'list-item' : 'none';
      }
    });
  }
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
  
  // Determina il colore del marker per questa voce
  let markerColor = '#1f76d2'; // blu di default
  if (place.searchSource) {
    const searchNum = place.searchSource.match(/\d+/);
    if (searchNum) {
      const numSearch = parseInt(searchNum[0]);
      if (numSearch >= 1 && numSearch <= 4) {
        markerColor = '#d32f2f'; // Rosso per ricerche 1-4
      } else {
        markerColor = getSearchColor(numSearch);
      }
    }
  }
  
  const el = document.createElement('li');
  el.className = 'place-item';
  el.dataset.markerColor = markerColor; // Aggiungi attributo per filtraggio
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