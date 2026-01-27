/**
 * place.js - Classe modello per standardizzare i luoghi
 * Gestisce la normalizzazione dei dati da diverse fonti (Google Maps JS API, Places API New/Old)
 */

class Place {
    constructor(apiData, searchNumber = null) {
        // 1. Identificativo
        this.place_id = apiData.id || apiData.place_id;

        // 2. Nome (gestisce il formato oggetti complesso delle nuove API)
        this.name = this._extractName(apiData);

        // 3. Indirizzo
        this.vicinity = apiData.formattedAddress || apiData.vicinity || apiData.formatted_address || '';

        // 4. Geometria e Posizione (Il punto più critico)
        this.location = this._extractLocation(apiData); // { lat: Number, lng: Number }
        
        // Proprietà di compatibilità per markers.js (che si aspetta geometry.location)
        this.geometry = {
            location: this.location
        };

        // 5. Dati aggiuntivi
        this.rating = apiData.rating || 0;
        this.userRatingCount = apiData.userRatingCount || apiData.user_ratings_total || 0;
        this.priceLevel = apiData.priceLevel || apiData.price_level;
        this.websiteUri = apiData.websiteUri || apiData.website;
        this.types = apiData.types || [];
        // Preserva le foto originali se presenti
        this.photos = apiData.photos || [];

        // 6. Metadati applicativi
        // Se searchNumber è passato (es. 1, 2), crea la stringa "Ricerca X", altrimenti usa come stringa
        this.searchSource = searchNumber 
            ? (typeof searchNumber === 'number' ? `Ricerca ${searchNumber}` : searchNumber) 
            : null;
    }

    /**
     * Estrae il nome gestendo i vari formati Google
     */
    _extractName(data) {
        if (data.displayName && typeof data.displayName === 'object' && data.displayName.text) {
            return data.displayName.text;
        }
        return data.displayName || data.name || 'Sconosciuto';
    }

    /**
     * Normalizza la posizione in {lat, lng}
     */
    _extractLocation(data) {
        // Caso A: API Nuova (location.latitude)
        if (data.location && typeof data.location.latitude === 'number') {
            return { lat: data.location.latitude, lng: data.location.longitude };
        }
        
        // Caso B: Geometry object (API JS o Legacy)
        if (data.geometry && data.geometry.location) {
            const loc = data.geometry.location;
            // Se è una funzione funzione di Google Maps
            if (typeof loc.lat === 'function') {
                return { lat: loc.lat(), lng: loc.lng() };
            }
            // Se è un oggetto semplice
            return { lat: loc.lat, lng: loc.lng };
        }

        return { lat: 0, lng: 0 };
    }

    /**
     * Serializzazione JSON personalizzata
     * Quando fai JSON.stringify(appState), verranno salvati solo questi dati
     * per risparmiare memoria nel localStorage
     */
    toJSON() {
        return {
            place_id: this.place_id,
            name: this.name,
            vicinity: this.vicinity,
            location: this.location,
            rating: this.rating,
            userRatingCount: this.userRatingCount,
            websiteUri: this.websiteUri,
            types: this.types,
            searchSource: this.searchSource
            // Nota: Non salviamo le 'photos' per non intasare il localStorage
        };
    }
}
