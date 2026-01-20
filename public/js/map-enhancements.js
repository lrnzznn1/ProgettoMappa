/**
 * map-enhancements.js - Miglioramenti avanzati per Google Maps
 * Aggiunge controlli personalizzati e miglioramenti UX
 */

// Funzione per aggiungere controlli personalizzati alla mappa
function addCustomMapControls(map) {
  // ===== CONTROLLO PERSONALIZZATO PER RESET VISTA =====
  const resetViewControl = document.createElement('div');
  resetViewControl.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    margin: 10px;
    text-align: center;
    user-select: none;
    padding: 8px 12px;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s ease;
  `;
  resetViewControl.innerHTML = '🏠 Roma';
  resetViewControl.title = 'Torna alla vista iniziale di Roma';

  resetViewControl.addEventListener('click', () => {
    map.setCenter(APP_CONFIG.DEFAULT_CENTER);
    map.setZoom(APP_CONFIG.DEFAULT_ZOOM);
  });

  resetViewControl.addEventListener('mouseenter', () => {
    resetViewControl.style.background = 'rgba(59, 130, 246, 0.1)';
    resetViewControl.style.transform = 'scale(1.05)';
  });

  resetViewControl.addEventListener('mouseleave', () => {
    resetViewControl.style.background = 'rgba(255, 255, 255, 0.95)';
    resetViewControl.style.transform = 'scale(1)';
  });

  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(resetViewControl);

  // ===== CONTROLLO LAYER SWITCH =====
  const layerControl = document.createElement('div');
  layerControl.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    margin: 10px;
    text-align: center;
    user-select: none;
    padding: 8px 12px;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s ease;
  `;
  layerControl.innerHTML = '🗺️ Satellite';
  layerControl.title = 'Cambia vista mappa';

  let isRoadmap = true;
  layerControl.addEventListener('click', () => {
    if (isRoadmap) {
      map.setMapTypeId(google.maps.MapTypeId.HYBRID);
      layerControl.innerHTML = '🌍 Strada';
      isRoadmap = false;
    } else {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      layerControl.innerHTML = '🗺️ Satellite';
      isRoadmap = true;
    }
  });

  layerControl.addEventListener('mouseenter', () => {
    layerControl.style.background = 'rgba(59, 130, 246, 0.1)';
    layerControl.style.transform = 'scale(1.05)';
  });

  layerControl.addEventListener('mouseleave', () => {
    layerControl.style.background = 'rgba(255, 255, 255, 0.95)';
    layerControl.style.transform = 'scale(1)';
  });

  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(layerControl);

  console.log('✨ Controlli personalizzati della mappa aggiunti');
}

// Funzione per migliorare l'aspetto dei marker
function createEnhancedMarker(position, map, title, color = '#d32f2f') {
  // Crea un marker con icona personalizzata SVG
  const svgIcon = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: color,
    fillOpacity: 0.8,
    strokeWeight: 2,
    strokeColor: '#ffffff',
    strokeOpacity: 1.0
  };

  const marker = new google.maps.Marker({
    position: position,
    map: map,
    title: title,
    icon: svgIcon,
    animation: google.maps.Animation.DROP,
    optimized: true
  });

  // Aggiungi effetto hover
  marker.addListener('mouseover', () => {
    marker.setIcon({
      ...svgIcon,
      scale: 10,
      strokeWeight: 3
    });
  });

  marker.addListener('mouseout', () => {
    marker.setIcon(svgIcon);
  });

  return marker;
}

// Funzione per aggiungere animazioni smooth ai controlli
function animateMapControls() {
  // Attendi che i controlli siano renderizzati
  setTimeout(() => {
    const controls = document.querySelectorAll('.gmnoprint, .gm-bundled-control');
    controls.forEach((control, index) => {
      control.style.opacity = '0';
      control.style.transform = 'translateY(-20px)';
      control.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        control.style.opacity = '1';
        control.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }, 500);
}

// Esporta le funzioni
if (typeof window !== 'undefined') {
  window.addCustomMapControls = addCustomMapControls;
  window.createEnhancedMarker = createEnhancedMarker;
  window.animateMapControls = animateMapControls;
}