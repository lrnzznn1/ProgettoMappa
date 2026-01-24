/**
 * search.js - Logica di ricerca e chiamate API
 */

/**
 * searchPlaces(circle, map, markers, infoWindow) - Ricerca ristoranti nel raggio specificato dal cerchio
 * 
 * Processo:
 * 1. Cancella i marker e la lista precedenti
 * 2. Estrae il centro e il raggio del cerchio
 * 3. Invia 9 richieste parallele al server (/api/places/searchNearby) con configurazioni diverse
 * 4. Raggruppa i risultati per ricerca e li mostra organizzati nella sidebar
 * 5. Aggiorna lo stato nella sidebar
 */
async function searchPlaces(circle, map, markers, infoWindow, offsetCirclesData) {
  const placesListEl = document.getElementById('places-list');
  const exportBtn = document.getElementById('export-json');
  const apiResponseEl = document.getElementById('api-response-container');
  const apiResponseTextEl = document.getElementById('api-response-text');
  
  clearMarkers(markers);                        // Rimuovi tutti i marker precedenti
  if (placesListEl) placesListEl.innerHTML = ''; // Svuota la lista
  let lastPlaces = [];                          // Resetta i risultati
  
  const center = circle.getCenter();
  const radius = Math.round(circle.getRadius());

  // Log per debugging
  const centerLatLng = {lat: center.lat(), lng: center.lng()};
  console.log('Searching restaurants for:', centerLatLng, 'radius:', radius);

  // Reset delle statistiche per nuova ricerca
  if (typeof resetSearchStats === 'function') resetSearchStats();

  try {
    const searchConfigs = getSearchConfigs();

    // LOG: Mostra dati dei sottocerchi usati per le chiamate
    console.log('\n=== 🔴 CHIAMATE API SOTTOCERCHI (1-4) ===');
    offsetCirclesData.forEach((data, idx) => {
      console.log(`  Ricerca ${idx+1}: centro LAT=${data.center.lat.toFixed(6)}, LNG=${data.center.lng.toFixed(6)}, RAGGIO=${Math.round(data.radius)}m`);
    });
    console.log('='.repeat(50));

    const searchPromises = searchConfigs.map((config, idx) => {
      let searchLat = center.lat();
      let searchLng = center.lng();
      let searchRadius = radius;

      // Per le ricerche 1-4 usa i dati dei sottocerchi disegnati
      if (config.searchNumber >= 1 && config.searchNumber <= 4 && offsetCirclesData[idx]) {
        searchLat = offsetCirclesData[idx].center.lat;
        searchLng = offsetCirclesData[idx].center.lng;
        searchRadius = offsetCirclesData[idx].radius;
      } else {
        // Per le altre ricerche mantieni la logica precedente
        if (config.offsetLat !== undefined && config.offsetLng !== undefined) {
          searchLat += config.offsetLat;
          searchLng += config.offsetLng;
        }
        if (config.radius !== undefined) {
          searchRadius = config.radius;
        }
      }

      const payload = { 
        lat: searchLat, 
        lng: searchLng, 
        radius: searchRadius,
        includedTypes: config.includedTypes,
        excludedTypes: config.excludedTypes,
        rankPreference: "POPULARITY"
      };

      console.log(`📤 Inviando Ricerca ${config.searchNumber} (${config.label}): LAT=${searchLat.toFixed(6)}, LNG=${searchLng.toFixed(6)}, R=${searchRadius}m`);

      return fetch('/api/places/searchNearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(json => ({ searchNumber: config.searchNumber, data: json }))
      .catch(err => ({ searchNumber: config.searchNumber, error: err.message }));
    });

    // Esegui tutte le 9 ricerche in parallelo
    const allResults = await Promise.all(searchPromises);
    const searchResults = []; // Array per tracciare i risultati di ogni ricerca
    
    // Mostra le risposte JSON complete (ma nascoste di default)
    if (apiResponseEl && apiResponseTextEl) {
      apiResponseTextEl.innerText = JSON.stringify(allResults, null, 2);
      // Non mostrare automaticamente, lascia che l'utente decida
    }

    // Processa i risultati
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
      let results = data.places || [];
      const places = [];

      // 🔍 DEBUG: Vediamo cosa arriva dall'API
      console.log(`📥 Risposta API Ricerca ${result.searchNumber}:`, data);
      console.log(`📥 Numero di places:`, results.length);
      if (results.length > 0) {
        console.log(`📥 Primo place completo:`, results[0]);
        console.log(`📥 Primo place.photos:`, results[0].photos);
      }

      // Filtro per le ricerche 1,2,3,4: solo risultati dentro il cerchio principale
      if ([1,2,3,4].includes(result.searchNumber)) {
        const mainCenter = circle.getCenter();
        const mainRadius = circle.getRadius();
        results = results.filter(place => {
          if (!place.location || place.location.latitude === undefined || place.location.longitude === undefined) return false;
          const dist = haversineDistance(mainCenter.lat(), mainCenter.lng(), place.location.latitude, place.location.longitude);
          return dist <= mainRadius;
        });
      }

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
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          priceLevel: place.priceLevel,
          websiteUri: place.websiteUri,
          types: place.types || [],
          photos: place.photos, // Importante: preserva le foto!
          searchSource: `Ricerca ${result.searchNumber}`  // Traccia quale ricerca ha trovato questo luogo
        };
        
        // Aggiungi il marker sulla mappa
        addPlaceMarker(simplified, map, markers, infoWindow);
        
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
      
      // Aggiungi ai searchResults per il report
      searchResults[result.searchNumber - 1] = places;
    });

    // Filtro automatico dei duplicati
    lastPlaces = filterDuplicates(lastPlaces);

    // Rendering sidebar con risultati raggruppati
    if (lastPlaces.length === 0) {
      if (placesListEl) {
        const li = document.createElement('li');
        li.className = 'place-item';
        li.style.padding = '10px';
        li.style.fontStyle = 'italic';
        li.textContent = 'Nessun risultato trovato in quest\'area.';
        placesListEl.appendChild(li);
      }
      setMapStatus('Nessun risultato trovato');
      return lastPlaces;
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
    if (placesListEl) {
      for (let i = 1; i <= 9; i++) {
        const places = groupedBySearch[i] || [];
        
        const header = document.createElement('li');
        header.className = 'search-section-header';
        header.dataset.sectionColor = getSearchColor(i); // Aggiungi attributo per filtraggio
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
            addPlaceToList(place, markers, map);
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
    }

    // Aggiorna il contatore nella sidebar
    setMapStatus(`Trovati ${lastPlaces.length} risultati unici`);
    
    // Aggiorna statistiche per il report PDF
    if (typeof updateSearchStats === 'function') {
      updateSearchStats({
        totalRequests: searchConfigs.length,
        totalResults: allResults.length,
        searchDetails: searchResults.map((places, idx) => ({
          count: places.length,
          types: searchConfigs[idx]?.includedTypes?.join(', ') || 'N/A'
        }))
      });
    }
    
    // Il bottone rimane sempre abilitato (controllo nell'event listener)
    
    // Controlla e mostra i duplicati nella pagina (analisi)
    checkDuplicates(lastPlaces);
    
    return lastPlaces;
    
  } catch (err) {
    // Gestisci errori di rete o parsing
    console.error('Search failed', err);
    if (placesListEl) {
      const li = document.createElement('li');
      li.className = 'place-item';
      li.textContent = `Ricerca fallita: ${err.message}`;
      placesListEl.appendChild(li);
    }
    return [];
  }
}