/**
 * duplicates.js - Gestione analisi e controllo duplicati
 */

/**
 * checkDuplicates(lastPlaces) - Verifica se ci sono duplicati in lastPlaces basato su place_id
 * 
 * Restituisce un oggetto con:
 *   - hasDuplicates: boolean (true se ci sono duplicati)
 *   - count: numero totale di elementi
 *   - uniqueCount: numero di elementi unici
 *   - duplicates: array con i place_id che compaiono più volte
 *   - duplicateDetails: oggetto con dettagli per ogni duplicato
 */
function checkDuplicates(lastPlaces) {
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

/**
 * filterDuplicates(places) - Filtra lastPlaces per mantenere solo il primo occurrence di ogni place_id
 * @param {Array} places - Array di places da filtrare
 * @returns {Array} Array filtrato senza duplicati
 */
function filterDuplicates(places) {
  const seen = new Set();
  const uniquePlaces = [];
  
  places.forEach(place => {
    if (!seen.has(place.place_id)) {
      seen.add(place.place_id);
      uniquePlaces.push(place);
    }
  });
  
  return uniquePlaces;
}

// Esponi globalmente per debugging
if (typeof window !== 'undefined') {
  window.checkDuplicates = checkDuplicates;
}