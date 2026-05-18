// ============ GENERAR ESTILOS PDF PARA IMPRESIÓN ============
function getPDFStyles() {
    return `
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;background:white;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .pagina{width:100%;max-width:750px;margin:0 auto;padding:15px;background:white;page-break-after:always;min-height:100vh;}
        .pagina:last-child{page-break-after:avoid;}
        h1{text-align:center;color:#ff4d4d;font-size:18px;margin-bottom:3px;}
        h2{text-align:center;color:#1e293b;font-size:14px;margin-bottom:3px;}
        .info{text-align:center;color:#64748b;font-size:10px;margin-bottom:12px;}
        .carton{border:2px solid #000;border-radius:8px;padding:10px;margin-bottom:20px;background:white;width:100%;}
        table{width:100%;border-collapse:collapse;}
        th{background:#ff4d4d!important;color:white!important;padding:8px;font-size:14px;border:1px solid #000;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        td{padding:8px;border:1px solid #000;text-align:center;font-weight:bold;font-size:16px;}
        .free{background:#fef3c7!important;font-size:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .num-carton{text-align:center;margin-bottom:6px;}
        .num-carton span{background:#ff4d4d!important;color:white!important;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .jugador{text-align:center;color:#10b981;margin:3px 0;font-size:12px;font-weight:bold;}
        @media print {
            body{margin:0;padding:0;}
            .pagina{page-break-after:always;min-height:auto;}
            .pagina:last-child{page-break-after:avoid;}
        }
    `;
}

// ============ EXPORTAR PDF - TODOS ============
function exportarPDFTodos() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) { alert('No hay cartones'); return; }
        const cartones = [];
        snap.forEach(function(c) { cartones.push(c.val()); });
        cartones.sort((a, b) => (a.numero || 0) - (b.numero || 0));
        console.log('Cartones a exportar:', cartones.length);
        mostrarToast('⏳ Abriendo vista de impresión...');
        abrirVentanaImpresion(cartones, 'Todos los Cartones');
    });
}

// ============ EXPORTAR PDF POR JUGADOR ============
function exportarPDFPorJugador(nombreJugador) {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const cartones = [];
        snap.forEach(function(c) { if (c.val().asignadoA === nombreJugador) cartones.push(c.val()); });
        if (cartones.length === 0) { alert('No hay cartones para: ' + nombreJugador); return; }
        cartones.sort((a, b) => (a.numero || 0) - (b.numero || 0));
        mostrarToast('⏳ Abriendo vista de impresión...');
        abrirVentanaImpresion(cartones, '👤 ' + nombreJugador);
    });
}

// ============ ABRIR VENTANA DE IMPRESIÓN ============
function abrirVentanaImpresion(cartones, titulo) {
    const ventana = window.open('', '_blank', 'width=800,height=600');
    
    ventana.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bingo - ' + titulo + '</title>');
    ventana.document.write('<style>' + getPDFStyles() + '</style>');
    ventana.document.write('</head><body>');
    
    // 2 cartones por página
    for (let i = 0; i < cartones.length; i += 2) {
        ventana.document.write('<div class="pagina">');
        ventana.document.write('<h1>🎯 BINGO PRO</h1>');
        ventana.document.write('<h2>' + titulo + '</h2>');
        ventana.document.write('<p class="info">Página ' + (Math.floor(i/2) + 1) + ' | ' + cartones.length + ' cartones | ' + new Date().toLocaleDateString() + '</p>');
        
        // Primer cartón
        ventana.document.write(htmlCartonPDF(cartones[i]));
        
        // Segundo cartón (si existe)
        if (i + 1 < cartones.length) {
            ventana.document.write(htmlCartonPDF(cartones[i + 1]));
        }
        
        ventana.document.write('</div>');
    }
    
    ventana.document.write('<script>');
    ventana.document.write('window.onload = function() {');
    ventana.document.write('  setTimeout(function() {');
    ventana.document.write('    window.print();');
    ventana.document.write('  }, 800);');
    ventana.document.write('};');
    ventana.document.write('<\/script>');
    
    ventana.document.write('</body></html>');
    ventana.document.close();
    
    mostrarToast('✅ Ventana de impresión abierta. Selecciona "Guardar como PDF" en el diálogo.');
}

// ============ HTML CARTÓN PDF ============
function htmlCartonPDF(c) {
    if (!c || !c.carton) return '<div class="carton"><p style="text-align:center;color:red;">Error: Cartón sin datos</p></div>';
    
    const carton = c.carton;
    const numero = c.numero || '?';
    const asignadoA = c.asignadoA || '';
    
    let html = '<div class="carton">';
    html += '<div class="num-carton"><span>Cartón #' + numero + '</span></div>';
    if (asignadoA) html += '<p class="jugador">👤 ' + asignadoA + '</p>';
    html += '<table>';
    html += '<tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let f = 0; f < 5; f++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(function(l) {
            const valor = carton[l] ? carton[l][f] : '?';
            const centro = (l === 'N' && f === 2);
            html += '<td class="' + (centro ? 'free' : '') + '">' + (centro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table></div>';
    return html;
}

// ============ MENÚ PDF (ACTUALIZADO) ============
function abrirMenuPDF() {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        const jugadores = new Set();
        snap.forEach(function(c) { if (c.val().asignadoA) jugadores.add(c.val().asignadoA); });
        
        let html = '<div style="padding:20px;">';
        html += '<h2 style="color:#ff4d4d;text-align:center;margin-bottom:20px;">📄 EXPORTAR PDF</h2>';
        html += '<p style="color:#64748b;text-align:center;font-size:0.8rem;margin-bottom:15px;">Se abrirá una ventana de impresión. Selecciona "Guardar como PDF"</p>';
        
        html += '<button onclick="exportarPDFTodos()" style="width:100%;padding:15px;background:#ff4d4d;color:white;border:none;border-radius:10px;cursor:pointer;font-size:1.1rem;font-weight:bold;margin-bottom:20px;">📄 TODOS LOS CARTONES (' + total + ')</button>';
        
        if (jugadores.size > 0) {
            html += '<h3 style="color:#1e293b;margin-bottom:10px;">👤 Por Jugador</h3><div style="max-height:50vh;overflow-y:auto;">';
            jugadores.forEach(function(j) {
                let c = 0; snap.forEach(function(ch) { if (ch.val().asignadoA === j) c++; });
                html += '<div style="background:#f1f5f9;padding:12px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">';
                html += '<div><strong>👤 ' + j + '</strong><br><span style="font-size:0.8rem;color:#64748b;">' + c + ' cart.</span></div>';
                html += '<button onclick="exportarPDFPorJugador(\'' + j.replace(/'/g,"\\'") + '\')" style="background:#8b5cf6;color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;font-weight:bold;">📄 PDF</button>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p style="color:#94a3b8;text-align:center;">No hay jugadores asignados aún</p>';
        }
        html += '</div>';
        preview.innerHTML = html;
    });
}
