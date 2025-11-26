require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

// Setup view engine and static folder
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Root route: render the index and inject API key
app.get('/', (req, res) => {
  res.render('index', { apiKey });
});

// Server-side endpoint that performs a Places REST 'searchNearby' call
app.post('/api/places/searchNearby', async (req, res) => {
  try {
    console.log('Server received /api/places/searchNearby:', req.body);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Server missing Google Maps API key' });

    const { lat, lng, radius, includedTypes = ['restaurant'], maxResultCount = 20 } = req.body || {};
    if (!lat || !lng || !radius) return res.status(400).json({ ok: false, error: 'lat, lng and radius are required' });

    const requestBody = {
      includedTypes,
      maxResultCount,
      locationRestriction: {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: Number(radius)
        }
      }
    };

    // Use the classic Places Web Service 'nearbysearch' (no fieldmask required)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${Number(lat)},${Number(lng)}&radius=${Number(radius)}&type=${encodeURIComponent(includedTypes[0] || 'restaurant')}&key=${apiKey}`;
    const fetchFn = (typeof fetch === 'function') ? fetch : null;
    let fetchRes;
    const fieldMask = process.env.PLACES_FIELD_MASK || 'places.displayName,places.location,places.formatted_address,places.place_id';
    if (fetchFn) {
      fetchRes = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await fetchRes.json();
      return res.json({ ok: true, data: json });
    }

    // Fallback using https if fetch isn't available
    const https = require('https');
    const bodyStr = JSON.stringify(requestBody);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    const result = await new Promise((resolve, reject) => {
      const reqData = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => resolve({ statusCode: resp.statusCode, body: data }));
      });
      reqData.on('error', reject);
      reqData.write(bodyStr);
      reqData.end();
    });
    const parsed = JSON.parse(result.body || '{}');
    return res.json({ ok: true, data: parsed });
  } catch (err) {
    console.error('Error calling server-side Places API', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Status endpoint for debugging
app.get('/status', (req, res) => {
  res.json({ ok: true, hasGoogleKey: !!apiKey });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
