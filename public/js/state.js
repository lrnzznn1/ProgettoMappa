/**
 * state.js - Gestione dello stato dell'applicazione (AppState)
 * 
 * Questa classe gestisce i dati centralizzati dell'applicazione:
 * 1. Risultati della ricerca corrente (visualizzati su mappa)
 * 2. Pianificazione del viaggio (luoghi salvati per giorno)
 * 3. Persistenza dei dati (localStorage)
 */

class AppState {
    constructor() {
        // Stato volatile: risultati della ricerca corrente
        this.currentSearchResults = [];
        
        // Stato persistente: pianificazione viaggio
        this.tripPlan = {
            name: "Il mio itinerario",
            days: {
                // Esempio struttura:
                // "day1": [ { placeId, name, lat, lng, time, note, ... } ]
            }
        };

        this.STORAGE_KEY = 'food_trip_planner_state';
        
        // Carica dati salvati all'avvio
        this.load();
    }

    /**
     * Imposta i risultati della ricerca corrente
     * @param {Array} results - Array di luoghi trovati
     */
    setSearchResults(results) {
        this.currentSearchResults = results || [];
        console.log(`AppState: aggiornati ${this.currentSearchResults.length} risultati di ricerca.`);
    }

    /**
     * Restituisce i risultati della ricerca corrente
     */
    getSearchResults() {
        return this.currentSearchResults;
    }

    /**
     * Aggiunge un luogo a uno specifico giorno del viaggio
     * @param {string} dayId - Identificativo del giorno (es. 'day1')
     * @param {Object|Place} placeData - Dati del luogo o istanza di Place
     * @param {string} [time] - Orario opzionale (es. '13:00')
     */
    addToTrip(dayId, placeData, time = null) {
        if (!this.tripPlan.days[dayId]) {
            this.tripPlan.days[dayId] = [];
        }

        // Se placeData non è un'istanza di Place, prova a convertirlo
        // ma se state.js è caricato dopo place.js, 'Place' dovrebbe essere disponibile
        const pId = placeData.place_id || placeData.id;

        // Verifica duplicati nello stesso giorno se necessario
        const exists = this.tripPlan.days[dayId].some(p => p.place_id === pId);
        if (exists) {
            console.warn(`Il luogo ${placeData.name} è già presente nel ${dayId}`);
            return false;
        }

        // Se è già un'istanza di Place, usalo direttamente (ma clonalo per aggiungere metadati del trip)
        // Se non lo è, crea un oggetto simile
        let tripItem;
        
        if (placeData instanceof Place) {
            // Clona i dati essenziali usando toJSON o creando un nuovo oggetto
            tripItem = {
                ...placeData.toJSON(), // Prende solo dati "salvabili"
                tripTime: time,
                addedAt: new Date().toISOString()
            };
        } else {
            // Fallback per oggetti legacy
            tripItem = {
                place_id: pId,
                name: placeData.name || placeData.displayName,
                vicinity: placeData.formatted_address || placeData.vicinity,
                location: placeData.geometry?.location || placeData.location,
                rating: placeData.rating,
                searchSource: placeData.searchType || placeData.searchSource,
                tripTime: time,
                addedAt: new Date().toISOString()
            };
        }

        this.tripPlan.days[dayId].push(tripItem);
        this.save();
        console.log(`Aggiunto ${tripItem.name} a ${dayId}`);
        return true;
    }

    /**
     * Rimuove un luogo dal viaggio
     * @param {string} dayId - Identificativo del giorno
     * @param {string} placeId - ID del luogo da rimuovere
     */
    removeFromTrip(dayId, placeId) {
        if (!this.tripPlan.days[dayId]) return;

        this.tripPlan.days[dayId] = this.tripPlan.days[dayId].filter(item => item.place_id !== placeId); // Usa place_id standard
        
        this.save();
    }

    /**
     * Restituisce il piano per un giorno specifico o tutto il piano
     */
    getTrip(dayId = null) {
        if (dayId) {
            return this.tripPlan.days[dayId] || [];
        }
        return this.tripPlan;
    }

    /**
     * Salva lo stato persistente nel LocalStorage
     */
    save() {
        try {
            const dataToSave = {
                tripPlan: this.tripPlan,
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
            console.log('AppState: salvataggio completato');
        } catch (e) {
            console.error('Errore durante il salvataggio dello stato:', e);
        }
    }

    /**
     * Carica lo stato dal LocalStorage
     */
    load() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.tripPlan) {
                    this.tripPlan = parsed.tripPlan;
                    console.log('AppState: caricamento completato');
                }
            }
        } catch (e) {
            console.error('Errore durante il caricamento dello stato:', e);
            // In caso di errore resetta o gestisci come preferisci
        }
    }

    /**
     * Pulisce tutto lo stato salvato
     */
    clearData() {
        this.tripPlan = { name: "Nuovo viaggio", days: {} };
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('AppState: dati cancellati');
    }
}

// Esporta istanza globale
const appState = new AppState();
