// generar.js - Lógica principal del generador de cartones
// Versión corregida sin errores de sintaxis

// ============ CONFIGURACIÓN ============
const CONFIG = {
    SALA_ID: localStorage.getItem('salaActiva') || generarSalaNueva(),
    CARTONES_SELECCIONADOS: new Set()
};

function generarSalaNueva() {
    const salaId = 'sala-' + Date.now().toString(36);
    localStorage.setItem('salaActiva', salaId);
    return salaId;
}

// ============ GENERADOR DE CARTÓN ============
function generarCartonBingo() {
    const columnas = {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75)
    };
    
    columnas.N[2] = '⭐'; // Espacio libre
    return columnas;
}

function generarColumna(min, max) {
    const disponibles = Array.from({length: max - min + 1}, (_, i) => i + min);
    const seleccionados = [];
    
    for (let i = 0; i < 5; i++) {
        const indice = Math.floor(Math.random() * disponibles.length);
        seleccionados.push(disponibles.splice(indice, 1)[0]);
    }
    
    return seleccionados.sort((a, b) => a - b);
}

// ============ GENERAR LOTE ============
window.generarLote = function() {
    const input = document.getElementById('cantidadGenerar');
    if (!input) return;
    
    const cantidad = parseInt(input.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarToast('❌ Ingresa un número válido (1-100)', 'error');
        return;
    }
    
    if (cantidad > 100) {
        mostrarToast('⚠️ Máximo 100 cartones por lote', 'error');
        return;
    }

    const updates = {};
    let generados = 0;
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'carton-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
        const carton = generarCartonBingo();
        
        updates['salas/' + CONFIG.SALA_ID + '/cartones/' + id] = {
            id: id,
            nombre: 'Cartón #' + (i + 1),
            carton: carton,
            estado: 'disponible',
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
            fechaModificacion: firebase.database.ServerValue.TIMESTAMP
        };
        
        generados++;
    }
    
    db.ref().update(updates)
        .then(() => {
            console.log('✅ ' + generados + ' cartones generados');
            input.value = '';
            mostrarToast('✅ ' + generados + ' cartones generados correctamente');
        })
        .catch(error => {
            console.error('❌ Error:', error);
            mostrarToast('Error al generar cartones', 'error');
        });
};

// ============ RENOMBRAR ============
window.renombrarCarton = function(id, nuevoNombre) {
    if (!nuevoNombre || nuevoNombre.trim() === '') {
        mostrarToast('❌ El nombre no puede estar vacío', 'error');
        return;
    }
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).update({ 
        nombre: nuevoNombre.trim(),
        fechaModificacion: firebase.database.ServerValue.TIMESTAMP
    });
};

// ============ CAMBIAR ESTADO ============
window.cambiarEstado = function(id, nuevoEstado) {
    const estadosValidos = ['disponible', 'asignado', 'usado'];
    if (!estadosValidos.includes(nuevoEstado)) return;
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).update({ 
        estado: nuevoEstado,
        fechaModificacion: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        mostrarToast('Estado: ' + nuevoEstado);
    });
};

// ============ VISTA PREVIA ============
window.verVistaPrevia = function(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;

    db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).once('value', (snap) => {
        const data = snap.val();
        if (data && data.carton) {
            preview.innerHTML = generarHTMLCartonDetalle(data);
            
            document.querySelectorAll('.card-carton').forEach(card => {
                card.classList.remove('seleccionado');
            });
            const cardSeleccionada = document.querySelector('[data-id="' + id + '"]');
            if (cardSeleccionada) {
                cardSeleccionada.classList.add('seleccionado');
            }
        } else {
            preview.innerHTML = '<p style="color:red">❌ Cartón no encontrado</p>';
        }
    });
};

function generarHTMLCartonDetalle(data) {
    const nombre = data.nombre || 'Sin nombre';
    const id = data.id || '';
    const carton = data.carton;
    const estado = data.estado || 'disponible';
    
    const estadosEmoji = {
        'disponible': '🟢',
        'asignado': '🟡',
        'usado': '🔴'
    };
    
    let html = '<div style="width:100%;">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<div>';
    html += '<h2 style="color:#1e293b; margin:0;">' + nombre + '</h2>';
    html += '<p style="color:#64748b; margin:5px 0;">ID: ' + id + '</p>';
    html += '<p style="margin:5px 0;">' + (estadosEmoji[estado] || '') + ' Estado: <strong>' + estado + '</strong></p>';
    html += '</div>';
    html += '<div style="display:flex; gap:10px;">';
    html += '<button onclick="window.exportarPDFCarton(\'' + id + '\')" style="background:#8b5cf6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer;">📄 PDF</button>';
    html += '<button onclick="window.copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer;">🔗 Copiar Link</button>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="margin-bottom:20px; display:flex; gap:10px;">';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'disponible\')" style="background:' + (estado === 'disponible' ? '#10b981' : '#e2e8f0') + '; color:' + (estado === 'disponible' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">🟢 Disponible</button>';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'asignado\')" style="background:' + (estado === 'asignado' ? '#f59e0b' : '#e2e8f0') + '; color:' + (estado === 'asignado' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">🟡 Asignado</button>';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'usado\')" style="background:' + (estado === 'usado' ? '#ef4444' : '#e2e8f0') + '; color:' + (estado === 'usado' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">🔴 Usado</button>';
    html += '</div>';
    
    html += '<table style="width:100%; border-collapse:collapse; margin:0 auto;">';
    html += '<tr style="background:#ff4d4d; color:white;"><th style="padding:15px;">B</th><th style="padding:15px;">I</th><th style="padding:15px;">N</th><th style="padding:15px;">G</th><th style="padding:15px;">O</th></tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:15px; border:2px solid #e2e8f0; text-align:center; font-size:1.2rem; font-weight:bold;' + (esCentro ? 'background:#fef3c7;' : '') + '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table></div>';
    return html;
}

// ============ SINCRONIZACIÓN ============
function cargarCartones() {
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').on('value', (snapshot) => {
        const btnContador = document.getElementById('contadorRegistrados');
        const total = snapshot.numChildren() || 0;
        if (btnContador) {
            btnContador.innerHTML = '🎫 CARTONES: ' + total;
        }
        actualizarListaCartones(snapshot);
    });
}

function actualizarListaCartones(snapshot) {
    const contenedor = document.getElementById('listaCartones');
    if (!contenedor) return;
    
    const total = snapshot.numChildren() || 0;
    
    if (total === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados</p>';
        return;
    }
    
    contenedor.innerHTML = '';
    
    const cartones = [];
    snapshot.forEach(child => {
        cartones.push({ id: child.key, ...child.val() });
    });
    
    const filtro = document.getElementById('buscadorCartones');
    const filtroValor = filtro ? filtro.value.toLowerCase() : '';
    
    cartones
        .sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0))
        .filter(carton => {
            if (!filtroValor) return true;
            const nombre = (carton.nombre || '').toLowerCase();
            const id = (carton.id || '').toLowerCase();
            return nombre.includes(filtroValor) || id.includes(filtroValor);
        })
        .forEach(carton => {
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', carton.id);
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                window.verVistaPrevia(carton.id);
            };
            
            const estadoClass = 'estado-' + (carton.estado || 'disponible');
            
            div.innerHTML = 
                '<div class="carton-header">' +
                '<span class="carton-id">#' + carton.id.slice(-8) + '</span>' +
                '<span class="carton-estado ' + estadoClass + '">' + (carton.estado || 'disponible') + '</span>' +
                '</div>' +
                '<input type="text" class="input-nombre-carton" value="' + (carton.nombre || '') + '" ' +
                'onchange="window.renombrarCarton(\'' + carton.id + '\', this.value)" ' +
                'onclick="event.stopPropagation()" placeholder="Nombre del cartón...">' +
                '<div class="carton-acciones">' +
                '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); window.copiarLinkCarton(\'' + carton.id + '\')">🔗</button>' +
                '<button class="btn-accion-pequeno pdf" onclick="event.stopPropagation(); window.exportarPDFCarton(\'' + carton.id + '\')">📄</button>' +
                '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); window.eliminarCarton(\'' + carton.id + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
}

// ============ FILTRAR ============
window.filtrarCartones = function(filtro) {
    const contenedor = document.getElementById('listaCartones');
    const cards = contenedor.querySelectorAll('.card-carton');
    
    cards.forEach(card => {
        const nombreInput = card.querySelector('.input-nombre-carton');
        const nombre = nombreInput ? nombreInput.value.toLowerCase() : '';
        const id = card.getAttribute('data-id').toLowerCase();
        const filtroLower = filtro.toLowerCase();
        
        if (nombre.includes(filtroLower) || id.includes(filtroLower)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
};

// ============ COPIAR LINK ============
window.copiarLinkCarton = function(id) {
    const link = generarLinkCarton(id);
    navigator.clipboard.writeText(link).then(() => {
        mostrarToast('✅ Link copiado al portapapeles');
    });
};

function generarLinkCarton(id) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    return baseUrl + 'carton.html?carton=' + id + '&sala=' + CONFIG.SALA_ID;
}

// ============ ELIMINAR ============
window.eliminarCarton = function(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).remove()
            .then(() => mostrarToast('🗑️ Cartón eliminado'));
    }
};

window.borrarTodo = function() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones').remove()
            .then(() => {
                document.getElementById('vista-previa-contenido').innerHTML = 
                    '<div class="preview-empty"><h2>✅ Todos los cartones eliminados</h2></div>';
                mostrarToast('🗑️ Todos los cartones eliminados');
            });
    }
};

// ============ VER LINKS ============
window.verLinks = function() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').once('value', (snap) => {
        if (!snap.exists()) {
            preview.innerHTML = '<p>No hay cartones para mostrar links</p>';
            return;
        }
        
        let html = '<h2 style="color:#ff4d4d; margin-bottom:20px;">🔗 LINKS DE CARTONES</h2>';
        html += '<div style="max-height:500px; overflow-y:auto; text-align:left;">';
        
        snap.forEach(child => {
            const carton = child.val();
            const link = generarLinkCarton(carton.id);
            
            html += '<div style="background:#f1f5f9; padding:10px; margin:8px 0; border-radius:6px;">';
            html += '<strong>' + (carton.nombre || 'Sin nombre') + '</strong>';
            html += '<div style="display:flex; gap:8px; margin-top:5px;">';
            html += '<input value="' + link + '" readonly style="flex:1; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">';
            html += '<button onclick="navigator.clipboard.writeText
