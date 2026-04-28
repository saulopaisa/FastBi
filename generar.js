// generar.js - Generador de Cartones de Bingo

// ============ CONFIGURACIÓN DE SALA ============
const SALA_ID = localStorage.getItem('salaActiva') || generarSalaNueva();

function generarSalaNueva() {
    const salaId = 'sala-' + Date.now().toString(36);
    localStorage.setItem('salaActiva', salaId);
    return salaId;
}

// ============ GENERADOR DE CARTÓN (TODOS DIFERENTES) ============
const cartonesGenerados = new Set(); // Para evitar duplicados

function generarCartonBingo() {
    let carton;
    let intentos = 0;
    
    do {
        carton = {
            B: generarColumna(1, 15),
            I: generarColumna(16, 30),
            N: generarColumna(31, 45),
            G: generarColumna(46, 60),
            O: generarColumna(61, 75)
        };
        intentos++;
    } while (cartonExiste(carton) && intentos < 100);
    
    cartonesGenerados.add(JSON.stringify(carton));
    return carton;
}

function cartonExiste(carton) {
    return cartonesGenerados.has(JSON.stringify(carton));
}

function generarColumna(min, max) {
    const numeros = [];
    const usados = new Set();
    
    while (numeros.length < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!usados.has(num)) {
            usados.add(num);
            numeros.push(num);
        }
    }
    
    numeros.sort((a, b) => a - b);
    // El centro (índice 2) será reemplazado por FREE solo en la columna N
    return numeros;
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('⚠️ Ingresa un número entre 1 y 100');
        return;
    }
    
    console.log('🎲 Generando ' + cantidad + ' cartones únicos...');
    mostrarToast('⏳ Generando ' + cantidad + ' cartones...');
    
    let generados = 0;
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        const carton = generarCartonBingo();
        
        // Marcar solo el centro de la columna N como FREE
        carton.N[2] = 'FREE';
        
        const datosCarton = {
            id: id,
            numero: generados + 1, // Número entero visible
            nombre: 'Cartón ' + (generados + 1),
            carton: carton,
            estado: 'disponible',
            asignadoA: '',
            creado: firebase.database.ServerValue.TIMESTAMP
        };
        
        db.ref('salas/' + SALA_ID + '/cartones/' + id)
            .set(datosCarton)
            .then(() => {
                generados++;
                if (generados === cantidad) {
                    console.log('✅ ' + generados + ' cartones generados');
                    mostrarToast('✅ ' + generados + ' cartones generados');
                    input.value = '';
                }
            })
            .catch(error => {
                console.error('❌ Error:', error);
                mostrarToast('❌ Error al generar', 'error');
            });
    }
}

// ============ SELECCIÓN MÚLTIPLE ============
let cartonesSeleccionados = new Set();

function toggleSeleccionCarton(id, event) {
    event.stopPropagation();
    
    const card = document.querySelector('[data-id="' + id + '"]');
    if (!card) return;
    
    if (cartonesSeleccionados.has(id)) {
        cartonesSeleccionados.delete(id);
        card.classList.remove('seleccionado');
    } else {
        cartonesSeleccionados.add(id);
        card.classList.add('seleccionado');
    }
    
    actualizarBotonAsignar();
}

function actualizarBotonAsignar() {
    const btnAsignar = document.getElementById('btnAsignar');
    if (btnAsignar) {
        const cantidad = cartonesSeleccionados.size;
        btnAsignar.textContent = cantidad > 0 ? '👤 ASIGNAR (' + cantidad + ')' : '👤 ASIGNAR';
        btnAsignar.style.display = cantidad > 0 ? 'block' : 'none';
    }
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    if (cartonesSeleccionados.size === 0) {
        alert('Selecciona al menos un cartón');
        return;
    }
    
    const nombreJugador = prompt('👤 Nombre del jugador:');
    if (!nombreJugador || !nombreJugador.trim()) return;
    
    const updates = {};
    const cartonesIds = Array.from(cartonesSeleccionados);
    
    cartonesIds.forEach(id => {
        updates['salas/' + SALA_ID + '/cartones/' + id + '/estado'] = 'asignado';
        updates['salas/' + SALA_ID + '/cartones/' + id + '/asignadoA'] = nombreJugador.trim();
    });
    
    db.ref().update(updates)
        .then(() => {
            // Generar link del jugador con todos sus cartones
            const linkJugador = generarLinkJugador(nombreJugador.trim(), cartonesIds);
            
            // Mostrar link en vista previa
            const preview = document.getElementById('vista-previa-contenido');
            preview.innerHTML = 
                '<div style="padding:20px;">' +
                '<h2 style="color:#10b981;">✅ Cartones asignados</h2>' +
                '<h3 style="color:#1e293b;">' + nombreJugador + '</h3>' +
                '<p style="color:#64748b;">' + cartonesIds.length + ' cartón(es) asignado(s)</p>' +
                '<div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">' +
                '<p style="color:#64748b; font-size:0.8rem;">Link para el jugador:</p>' +
                '<div style="display:flex; gap:10px;">' +
                '<input id="linkJugadorInput" value="' + linkJugador + '" readonly style="flex:1; padding:10px; border:2px solid #3b82f6; border-radius:6px; font-size:0.85rem;" onclick="this.select()">' +
                '<button onclick="copiarLinkJugador()" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">📋 COPIAR</button>' +
                '</div>' +
                '</div>' +
                '<button onclick="exportarPDFJugador(\'' + nombreJugador.trim() + '\', ' + JSON.stringify(cartonesIds) + ')" style="background:#8b5cf6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; margin-top:10px;">📄 Exportar PDF del Jugador</button>' +
                '</div>';
            
            // Limpiar selección
            cartonesSeleccionados.clear();
            document.querySelectorAll('.card-carton.seleccionado').forEach(c => c.classList.remove('seleccionado'));
            actualizarBotonAsignar();
            
            mostrarToast('✅ Asignado a ' + nombreJugador);
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('❌ Error al asignar', 'error');
        });
}

function generarLinkJugador(nombre, cartonesIds) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    const cartonesParam = cartonesIds.join(',');
    return baseUrl + 'jugador.html?nombre=' + encodeURIComponent(nombre) + '&cartones=' + cartonesParam + '&sala=' + SALA_ID;
}

function copiarLinkJugador() {
    const input = document.getElementById('linkJugadorInput');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            mostrarToast('✅ Link copiado');
        });
    }
}

// ============ VISTA PREVIA (MUESTRA NÚMERO, NO ID) ============
function verVistaPrevia(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;
    
    preview.innerHTML = '<p style="color:#94a3b8;">Cargando...</p>';
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id)
        .once('value')
        .then(snap => {
            const datos = snap.val();
            if (datos && datos.carton) {
                preview.innerHTML = generarHTMLCarton(datos);
            } else {
                preview.innerHTML = '<p style="color:red;">❌ Cartón no encontrado</p>';
            }
        });
}

function generarHTMLCarton(datos) {
    const numero = datos.numero || '?';
    const nombre = datos.nombre || 'Cartón ' + numero;
    const estado = datos.estado || 'disponible';
    const asignadoA = datos.asignadoA || '';
    const carton = datos.carton;
    const id = datos.id;
    
    let html = '<div style="padding:20px;">';
    
    // Cabecera con número de cartón (no ID)
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">';
    html += '<div>';
    html += '<h2 style="color:#1e293b; margin:0;">Cartón #' + numero + '</h2>';
    if (nombre !== 'Cartón ' + numero) {
        html += '<p style="color:#64748b; margin:3px 0;">' + nombre + '</p>';
    }
    html += '<p style="color:#64748b; font-size:0.8rem; margin:3px 0;">Estado: <strong>' + estado + '</strong></p>';
    if (asignadoA) {
        html += '<p style="color:#10b981; font-size:0.8rem; margin:3px 0;">👤 Asignado a: ' + asignadoA + '</p>';
    }
    html += '</div>';
    html += '</div>';
    
    // Tabla del cartón
    html += '<table style="width:100%; border-collapse:collapse; margin:15px auto; max-width:350px;">';
    html += '<tr style="background:#ff4d4d; color:white;">';
    html += '<th style="padding:12px;">B</th><th style="padding:12px;">I</th><th style="padding:12px;">N</th><th style="padding:12px;">G</th><th style="padding:12px;">O</th>';
    html += '</tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:10px; border:2px solid #e2e8f0; text-align:center; font-weight:bold; font-size:1.1rem;';
            if (esCentro) html += 'background:#fef3c7;';
            html += '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table>';
    
    // Botones de acción
    html += '<div style="margin-top:15px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">';
    html += '<button onclick="copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔗 Link Individual</button>';
    html += '<button onclick="cambiarEstadoCarton(\'' + id + '\')" style="background:#f59e0b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔄 Estado</button>';
    html += '<button onclick="exportarPDFCarton(\'' + id + '\')" style="background:#8b5cf6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">📄 PDF</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

// ============ EXPORTAR PDF ============
async function exportarPDFCarton(id) {
    // Cargar html2pdf si no está disponible
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
        const datos = snap.val();
        if (!datos) return;
        
        const numero = datos.numero || '?';
        
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:30px; background:white; font-family:Arial;';
        pdfContent.innerHTML = 
            '<h1 style="text-align:center; color:#ff4d4d; margin-bottom:5px;">BINGO PRO</h1>' +
            '<h2 style="text-align:center; color:#1e293b;">Cartón #' + numero + '</h2>' +
            (datos.asignadoA ? '<p style="text-align:center; color:#64748b;">Jugador: ' + datos.asignadoA + '</p>' : '') +
            generarTablaPDF(datos.carton);
        
        html2pdf().set({
            margin: 10,
            filename: 'carton-' + numero + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(pdfContent).save();
    });
}

async function exportarPDFSeleccion() {
    if (cartonesSeleccionados.size === 0) {
        alert('Selecciona cartones primero');
        return;
    }
    
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    const ids = Array.from(cartonesSeleccionados);
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:20px; background:white; font-family:Arial;';
        
        let html = '<h1 style="text-align:center; color:#ff4d4d;">BINGO PRO</h1>';
        html += '<p style="text-align:center; color:#64748b;">Cartones Seleccionados</p>';
        html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px;">';
        
        ids.forEach(id => {
            const datos = snap.child(id).val();
            if (datos) {
                html += '<div style="border:2px solid #000; padding:10px; page-break-inside:avoid;">';
                html += '<h3 style="text-align:center; color:#ff4d4d;">Cartón #' + (datos.numero || '?') + '</h3>';
                html += generarTablaPDF(datos.carton);
                html += '</div>';
            }
        });
        
        html += '</div>';
        pdfContent.innerHTML = html;
        
        html2pdf().set({
            margin: 10,
            filename: 'cartones-seleccionados.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(pdfContent).save();
    });
}

async function exportarPDFJugador(nombre, cartonesIds) {
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:20px; background:white; font-family:Arial;';
        
        let html = '<h1 style="text-align:center; color:#ff4d4d;">BINGO PRO</h1>';
        html += '<h2 style="text-align:center; color:#1e293b;">' + nombre + '</h2>';
        html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px;">';
        
        cartonesIds.forEach(id => {
            const datos = snap.child(id).val();
            if (datos) {
                html += '<div style="border:2px solid #000; padding:10px; page-break-inside:avoid;">';
                html += '<h3 style="text-align:center; color:#ff4d4d;">Cartón #' + (datos.numero || '?') + '</h3>';
                html += generarTablaPDF(datos.carton);
                html += '</div>';
            }
        });
        
        html += '</div>';
        pdfContent.innerHTML = html;
        
        html2pdf().set({
            margin: 10,
            filename: 'cartones-' + nombre.replace(/\s+/g, '-') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(pdfContent).save();
    });
}

async function exportarPDFTodos() {
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            alert('No hay cartones para exportar');
            return;
        }
        
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:20px; background:white; font-family:Arial;';
        
        let html = '<h1 style="text-align:center; color:#ff4d4d;">BINGO PRO - Todos los Cartones</h1>';
        html += '<p style="text-align:center; color:#64748b;">Total: ' + snap.numChildren() + ' cartones</p>';
        html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px;">';
        
        snap.forEach(child => {
            const datos = child.val();
            html += '<div style="border:2px solid #000; padding:10px; page-break-inside:avoid;">';
            html += '<h3 style="text-align:center; color:#ff4d4d;">Cartón #' + (datos.numero || '?') + '</h3>';
            if (datos.asignadoA) {
                html += '<p style="text-align:center; color:#64748b;">👤 ' + datos.asignadoA + '</p>';
            }
            html += generarTablaPDF(datos.carton);
            html += '</div>';
        });
        
        html += '</div>';
        pdfContent.innerHTML = html;
        
        html2pdf().set({
            margin: 10,
            filename: 'todos-cartones.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(pdfContent).save();
    });
}

function generarTablaPDF(carton) {
    let tabla = '<table style="width:100%; border-collapse:collapse; margin:10px 0;">';
    tabla += '<tr style="background:#000; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        tabla += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            tabla += '<td style="border:1px solid #000; padding:8px; text-align:center; font-weight:bold;';
            if (esCentro) tabla += 'background:#ffd700;';
            tabla += '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        tabla += '</tr>';
    }
    
    tabla += '</table>';
    return tabla;
}

// ============ CARGAR SCRIPT DINÁMICO ============
function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============ RESTO DE FUNCIONES (MANTENER IGUAL) ============
function renombrarCarton(id, nombre) {
    if (nombre && nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

function cambiarEstadoCarton(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
        const datos = snap.val();
        const estadoActual = datos.estado || 'disponible';
        const estados = ['disponible', 'asignado', 'usado'];
        const nuevoEstado = estados[(estados.indexOf(estadoActual) + 1) % estados.length];
        
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ estado: nuevoEstado })
            .then(() => {
                mostrarToast('Estado: ' + nuevoEstado);
                verVistaPrevia(id);
            });
    });
}

function copiarLinkCarton(id) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    const link = baseUrl + 'carton.html?carton=' + id + '&sala=' + SALA_ID;
    navigator.clipboard.writeText(link).then(() => mostrarToast('✅ Link copiado'));
}

function eliminarCarton(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).remove()
            .then(() => mostrarToast('🗑️ Cartón eliminado'));
    }
}

function borrarTodo() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove()
            .then(() => {
                document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>✅ Todos eliminados</h2></div>';
                cartonesGenerados.clear();
                mostrarToast('🗑️ Todos eliminados');
            });
    }
}

function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            alert('No hay cartones');
            return;
        }
        const data = { version: '2.0', salaId: SALA_ID, fecha: new Date().toISOString(), cartones: snap.val() };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones-' + SALA_ID + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        mostrarToast('💾 Exportado');
    });
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.cartones) throw new Error('Formato inválido');
            if (confirm('¿Importar ' + Object.keys(data.cartones).length + ' cartones?')) {
                const updates = {};
                Object.keys(data.cartones).forEach(key => {
                    updates['salas/' + SALA_ID + '/cartones/' + key] = data.cartones[key];
                });
                db.ref().update(updates).then(() => mostrarToast('✅ Importados'));
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            preview.innerHTML = '<div class="preview-empty"><h2>📋 Sin cartones</h2></div>';
            return;
        }
        let html = '<h2 style="color:#ff4d4d;">🔗 LINKS</h2><div style="max-height:500px; overflow-y:auto; text-align:left;">';
        const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
        snap.forEach(child => {
            const c = child.val();
            const link = baseUrl + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px;">';
            html += '<strong>#' + (c.numero || '?') + ' - ' + (c.nombre || '') + '</strong>';
            if (c.asignadoA) html += ' <span style="color:#10b981;">(' + c.asignadoA + ')</span>';
            html += '<div style="display:flex; gap:5px; margin-top:5px;"><input value="' + link + '" readonly style="flex:1; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;" onclick="this.select()">';
            html += '<button onclick="copiarLinkCarton(\'' + c.id + '\')" style="background:#3b82f6; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">📋</button></div></div>';
        });
        html += '</div>';
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todasSeleccionadas = Array.from(cards).every(c => c.classList.contains('seleccionado'));
    
    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        if (todasSeleccionadas) {
            card.classList.remove('seleccionado');
            cartonesSeleccionados.delete(id);
        } else {
            card.classList.add('seleccionado');
            cartonesSeleccionados.add(id);
        }
    });
    
    actualizarBotonAsignar();
}

function filtrarCartones(texto) {
    const filtro = texto.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(card => {
        const nombre = (card.querySelector('.input-nombre-carton')?.value || '').toLowerCase();
        const id = (card.getAttribute('data-id') || '').toLowerCase();
        card.style.display = (nombre.includes(filtro) || id.includes(filtro)) ? '' : 'none';
    });
}

function mostrarToast(mensaje, tipo) {
    const toastAnterior = document.querySelector('.toast');
    if (toastAnterior) toastAnterior.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    if (tipo === 'error') toast.style.background = '#ef4444';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 2500);
}

// ============ SINCRONIZACIÓN ============
function iniciarSincronizacion() {
    db.ref('salas/' + SALA_ID + '/cartones').on('value', snapshot => {
        const total = snapshot.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados aún</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        
        const cartones = [];
        snapshot.forEach(child => cartones.push({ key: child.key, ...child.val() }));
        cartones.sort((a, b) => (b.creado || 0) - (a.creado || 0));
        
        cartones.forEach(carton => {
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', carton.key);
            if (cartonesSeleccionados.has(carton.key)) div.classList.add('seleccionado');
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verVistaPrevia(carton.key);
            };
            
            const estado = carton.estado || 'disponible';
            const numero = carton.numero || '?';
            const asignadoA = carton.asignadoA || '';
            
            div.innerHTML = 
                '<div class="carton-header">' +
                    '<span class="carton-id"># ' + numero + '</span>' +
                    '<span class="carton-estado estado-' + estado + '">' + estado + '</span>' +
                '</div>' +
                (asignadoA ? '<div style="font-size:0.7rem; color:#10b981; margin-bottom:4px;">👤 ' + asignadoA + '</div>' : '') +
                '<input type="text" class="input-nombre-carton" value="' + (carton.nombre || '') + '" ' +
                    'onchange="renombrarCarton(\'' + carton.key + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
                    '<button class="btn-accion-pequeno" onclick="toggleSeleccionCarton(\'' + carton.key + '\', event)" style="background:' + (cartonesSeleccionados.has(carton.key) ? '#10b981' : '#6b7280') + ';" title="Seleccionar">' + (cartonesSeleccionados.has(carton.key) ? '✓' : '○') + '</button>' +
                    '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLinkCarton(\'' + carton.key + '\')">🔗</button>' +
                    '<button class="btn-accion-pequeno" onclick="event.stopPropagation(); cambiarEstadoCarton(\'' + carton.key + '\')" style="background:#f59e0b;">🔄</button>' +
                    '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + carton.key + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
    });
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Bingo Admin v2.0');
    console.log('📁 Sala: ' + SALA_ID);
    
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', () => document.getElementById('fileIn').click());
    document.getElementById('btnPDF').addEventListener('click', () => {
        if (cartonesSeleccionados.size > 0) {
            exportarPDFSeleccion();
        } else {
            exportarPDFTodos();
        }
    });
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnSelTodos').addEventListener('click', seleccionarTodos);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', () => window.location.href = 'ruleta.html');
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', e => filtrarCartones(e.target.value));
    document.getElementById('cantidadGenerar').addEventListener('keypress', e => { if (e.key === 'Enter') generarLote(); });
    
    iniciarSincronizacion();
    
    db.ref('.info/connected').on('value', snap => {
        console.log(snap.val() ? '🟢 Conectado' : '🔴 Desconectado');
    });
});
