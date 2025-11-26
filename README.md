# Progetto Segretissimo — Node.js + Express + Google Maps

Questo progetto dimostrativo mostra come avviare una piccola app Node.js con Express che serve una pagina con una Google Map usando la Google Maps JavaScript API.

Prerequisiti
- Node.js (v16+ consigliata)
- Una Google API Key con le Maps JavaScript API abilitate e le eventuali restrizioni impostate

Quickstart
1. Copia `.env.example` in `.env` e inserisci la tua API key:

```
GOOGLE_MAPS_API_KEY=MIATUA_API_KEY_GOOGLE
```

2. Installa e avvia l'app:

```powershell
npm install
npm start
```

3. Apri il browser su `http://localhost:3000` e vedrai la mappa Google.

Funzionalità aggiunte
- Disegna un cerchio usando lo strumento "Cerchio" (nella barra in alto) per selezionare un'area.
- L'app elenca i ristoranti trovati nella sidebar a sinistra e mostra marker sulla mappa.
- Puoi cliccare su un ristorante nella lista per centrare la mappa su di esso.

Sicurezza e note
- La chiave Maps deve essere usata lato client (script), quindi limita l'utilizzo tramite restrizioni su chiavi API (referer HTTP).
- Se desideri evitare l'esposizione della chiave, puoi usare una soluzione server-side che proxy le richieste a Google oppure utilizzare token temporanei; ma le Maps JS API richiedono una chiave lato client.

Note sulle API richieste:
- Assicurati di abilitare le seguenti API per la tua chiave (Google Cloud Console):
	- Maps JavaScript API
	- Places API (necessaria per cercare e elencare i ristoranti)
	- (Opzionale) abilita restrizioni su referrer per `http://localhost:3000/*` durante lo sviluppo

	Server-side Places Search
	- Questo progetto include un endpoint server-side `POST /api/places/searchNearby` che esegue la ricerca 'nearbysearch' della Places Web Service sul server. Usare il server per fare ricerche evita limiti e restrizioni della chiave client e ti permette di tenere la chiave più privata.

	Esempio di chiamata a `POST /api/places/searchNearby` (usare lat/lng per il centro e radius in metri):

	```powershell
	curl -X POST "http://localhost:3000/api/places/searchNearby" -H "Content-Type: application/json" -d "{ \"lat\": 41.9028, \"lng\": 12.4964, \"radius\": 500 }"
	```

	Risposte standard:
	- `ok: true` con `data.results` che contiene gli oggetti `place` standard restituiti dalla API (name, geometry.location, vicinity, place_id, ecc.)
	- Se la richiesta fallisce riceverai un JSON con `ok: false` e `error` che descrive il problema.

Verifica rapido:

```powershell
# Copia .env.example -> .env e modifica la variabile
copy .env.example .env
# Modifica .env per inserire la tua chiave: GOOGLE_MAPS_API_KEY=...
npm install
npm start
# Poi apri: http://localhost:3000
```

Se non vedi la mappa:
- Assicurati di aver impostato la chiave Google correttamente in `.env`.
- Controlla i log della console del browser per errori (ad esempio messaggi del tipo "Google Maps JavaScript API error: InvalidKeyMapError").
- Verifica che la tua chiave abbia le restrizioni di referrer corrette per il dominio `localhost` durante lo sviluppo.

