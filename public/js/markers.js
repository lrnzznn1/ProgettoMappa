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
    
    // Costruisci URL immagine (Foto > Street View > Nulla)
    let imageHtml = '';
    const hasPhotos = place.photos && place.photos.length > 0;
    const hasKey = !!window.GOOGLE_MAPS_API_KEY;
    let imgUrl = '';

    if (hasPhotos && hasKey) {
      const photoData = place.photos[0];
      
      // Nuovo formato API Places v1: usa il campo "name"
      if (photoData.name) {
          imgUrl = `https://places.googleapis.com/v1/${photoData.name}/media?key=${window.GOOGLE_MAPS_API_KEY}&maxWidthPx=400&maxHeightPx=400`;
      }
      // Fallback per vecchio formato con photo_reference
      else if (photoData.photo_reference) {
          imgUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoData.photo_reference}&key=${window.GOOGLE_MAPS_API_KEY}`;
      }
    } else if (hasKey && place.geometry && place.geometry.location) {
        // --- FALLBACK STRATEGIA: STREET VIEW ---
        const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
        const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
        imgUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${window.GOOGLE_MAPS_API_KEY}`;
    }
      
    if (imgUrl) {
      imageHtml = `<img src="${imgUrl}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`;
    }

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
        ${imageHtml}
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
 * addPlaceToList(place, markers, map) - Aggiunge un elemento alla lista (compatibile con Old & New Layout)
 */
function addPlaceToList(place, markers, map) {
  const placesListEl = document.getElementById('places-list');
  if (!placesListEl) return;
  
  // --- NUOVO LAYOUT (JOYFUL) ---
  if (document.querySelector('.upper-deck')) {
      const el = document.createElement('li');
      el.className = 'res-card'; 
      el.draggable = true;
      el.dataset.placeId = place.place_id;
      
      // Colori placeholder 
      let placeholderColor = 'a29bfe';  // Default viola
      let placeholderText = 'G';
      const types = place.types || [];
      
      if (types.includes('restaurant') || types.includes('food')) { 
          placeholderColor = 'ff7675'; placeholderText = 'C'; 
      } else if (types.includes('museum') || types.includes('art_gallery')) { 
          placeholderColor = '74b9ff'; placeholderText = 'M'; 
      } else if (types.includes('park') || types.includes('nature')) { 
          placeholderColor = '55efc4'; placeholderText = 'P'; 
      }
      
      // Crea immagine placeholder SVG sempre funzionante
      const fallbackImg = `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
          <rect width="50" height="50" fill="#${placeholderColor}" rx="8"/>
          <text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="bold">${placeholderText}</text>
        </svg>
      `)}`;
      
      let imgUrl = fallbackImg; // Usa sempre placeholder per ora d
      
      // Usa foto reale se disponibile, altrimenti fallback su Street View
      const hasPhotos = place.photos && place.photos.length > 0;
      const hasKey = !!window.GOOGLE_MAPS_API_KEY;

      if (hasPhotos && hasKey) {
          const photoData = place.photos[0];
          
          // Nuovo formato API Places v1: usa il campo "name"
          if (photoData.name) {
              imgUrl = `https://places.googleapis.com/v1/${photoData.name}/media?key=${window.GOOGLE_MAPS_API_KEY}&maxWidthPx=400&maxHeightPx=400`;
          }
          // Fallback per vecchio formato con photo_reference
          else if (photoData.photo_reference) {
              imgUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoData.photo_reference}&key=${window.GOOGLE_MAPS_API_KEY}`;
          }
      } else if (hasKey && place.geometry && place.geometry.location) {
          // --- FALLBACK STRATEGIA: STREET VIEW ---
          // Se non ci sono foto, usiamo Street View Static API
          const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
          const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
          
          imgUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${window.GOOGLE_MAPS_API_KEY}`;
          console.log(`ℹ️ [${place.name}] Foto mancante, uso Street View fallback`);
      } else {
          // Logga il motivo per cui non c'è la foto (e usa SVG default)
          if (!hasPhotos && !hasKey) {
             console.error(`❌ [${place.name}] API Key mancante`);
          }
      }
      
      const ratingHtml = place.rating ? `<div class="rating-badge">★ ${place.rating}</div>` : '';
      const vicinity = place.vicinity || '';
      const startAddress = vicinity.substring(0, 30) + (vicinity.length > 30 ? '...' : '');

      el.innerHTML = `
        <img src="${imgUrl}" class="res-img" alt="${escapeHtml(place.name)}">
        <div class="res-info">
            <h4>${escapeHtml(place.name)}</h4>
            ${ratingHtml} 
            <small>• ${escapeHtml(startAddress)}</small>
        </div>
      `;

      el.addEventListener('click', () => {
        map.panTo(place.geometry.location);
        map.setZoom(16);
        const marker = markers.find(m => 
          Math.abs(m.getPosition().lat() - place.geometry.location.lat) < 0.0001 &&
          Math.abs(m.getPosition().lng() - place.geometry.location.lng) < 0.0001
        );
        if (marker) google.maps.event.trigger(marker, 'click');
        
        // Evidenzia selezione
        document.querySelectorAll('.res-card').forEach(c => c.style.borderColor = '#f0f0f0');
        el.style.borderColor = '#00cec9';
      });

      placesListEl.appendChild(el);
      return; 
  }

  // --- VECCHIO LAYOUT (LEGACY) ---
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