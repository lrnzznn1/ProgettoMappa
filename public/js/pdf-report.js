/**
 * pdf-report.js - Generazione report PDF dettagliato
 * Crea un report completo con statistiche di ricerca e risultati
 */

// Variabili globali per tracciare le statistiche
let searchStats = {
  totalRequests: 0,
  totalResults: 0,
  duplicatesRemoved: 0,
  outsideCircleRemoved: 0,
  searchDetails: []
};

// Funzione per aggiornare le statistiche (chiamata da search.js)
function updateSearchStats(stats) {
  searchStats = { ...searchStats, ...stats };
  console.log('📊 Statistiche aggiornate:', searchStats);
}

// Funzione principale per generare il report PDF
function generatePdfReport(places, circle) {
  try {
    console.log('📄 Generazione report PDF...');
    
    // Inizializza jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const lineHeight = 7;
    const marginLeft = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // ===== INTESTAZIONE =====
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Beyond the Travel - Report di Ricerca', marginLeft, yPos);
    yPos += lineHeight * 2;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, marginLeft, yPos);
    yPos += lineHeight * 2;
    
    // ===== INFORMAZIONI CERCHIO =====
    if (circle) {
      const center = circle.getCenter();
      const radius = Math.round(circle.getRadius());
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('📍 Area di Ricerca', marginLeft, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Centro: ${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}`, marginLeft + 5, yPos);
      yPos += lineHeight;
      doc.text(`Raggio: ${radius.toLocaleString('it-IT')} metri (${(radius/1000).toFixed(1)} km)`, marginLeft + 5, yPos);
      yPos += lineHeight * 2;
    }
    
    // ===== STATISTICHE GENERALI =====
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('📊 Statistiche di Ricerca', marginLeft, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Ricerche effettuate: ${searchStats.totalRequests || 9}`, marginLeft + 5, yPos);
    yPos += lineHeight;
    doc.text(`Risultati totali ottenuti: ${searchStats.totalResults || 0}`, marginLeft + 5, yPos);
    yPos += lineHeight;
    doc.text(`Duplicati rimossi: ${searchStats.duplicatesRemoved || 0}`, marginLeft + 5, yPos);
    yPos += lineHeight;
    doc.text(`Posti fuori dal cerchio rimossi: ${searchStats.outsideCircleRemoved || 0}`, marginLeft + 5, yPos);
    yPos += lineHeight;
    doc.text(`Risultati finali visualizzati: ${places.length}`, marginLeft + 5, yPos);
    yPos += lineHeight * 2;
    
    // ===== DETTAGLI RICERCHE =====
    if (searchStats.searchDetails && searchStats.searchDetails.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('🔍 Dettaglio delle 9 Ricerche', marginLeft, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      searchStats.searchDetails.forEach((detail, index) => {
        if (yPos > 270) { // Nuova pagina se necessario
          doc.addPage();
          yPos = 20;
        }
        
        const searchName = DEFAULT_SEARCHES[index]?.name || `Ricerca ${index + 1}`;
        doc.text(`${index + 1}. ${searchName}:`, marginLeft + 5, yPos);
        yPos += lineHeight * 0.8;
        doc.text(`   Risultati: ${detail.count || 0} | Tipi: ${detail.types || 'N/A'}`, marginLeft + 10, yPos);
        yPos += lineHeight * 0.8;
      });
      
      yPos += lineHeight;
    }
    
    // ===== LISTA POSTI =====
    if (places && places.length > 0) {
      // Controlla se serve nuova pagina
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`🏪 Posti Trovati (${places.length})`, marginLeft, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      places.forEach((place, index) => {
        if (yPos > 270) { // Nuova pagina
          doc.addPage();
          yPos = 20;
        }
        
        const name = place.displayName?.text || place.name || 'Nome non disponibile';
        const address = place.formattedAddress || place.vicinity || 'Indirizzo non disponibile';
        const rating = place.rating ? ` (⭐ ${place.rating})` : '';
        
        // Nome del posto
        doc.text(`${index + 1}. ${name}${rating}`, marginLeft + 5, yPos);
        yPos += lineHeight * 0.8;
        
        // Indirizzo (troncato se troppo lungo)
        const maxAddressLength = 80;
        const truncatedAddress = address.length > maxAddressLength 
          ? address.substring(0, maxAddressLength) + '...' 
          : address;
        doc.text(`    ${truncatedAddress}`, marginLeft + 10, yPos);
        yPos += lineHeight * 1.2;
      });
    }
    
    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Pagina ${i} di ${totalPages} - Beyond the Travel Report`, marginLeft, doc.internal.pageSize.getHeight() - 10);
    }
    
    // ===== SALVA PDF =====
    const fileName = `beyond-the-travel-report-${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
    
    console.log('✅ Report PDF generato:', fileName);
    
  } catch (error) {
    console.error('❌ Errore nella generazione del PDF:', error);
    alert('Errore nella generazione del report PDF. Controlla la console per dettagli.');
  }
}

// Funzione per resettare le statistiche (chiamata quando si disegna un nuovo cerchio)
function resetSearchStats() {
  searchStats = {
    totalRequests: 0,
    totalResults: 0,
    duplicatesRemoved: 0,
    outsideCircleRemoved: 0,
    searchDetails: []
  };
  console.log('🔄 Statistiche di ricerca resettate');
}

// Esponi le funzioni al scope globale
window.generatePdfReport = generatePdfReport;
window.updateSearchStats = updateSearchStats;
window.resetSearchStats = resetSearchStats;