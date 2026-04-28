// generar.js - Lógica principal del generador de cartones

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
        return alert('❌ Ingresa un número válido (1-100)');
    }
    
    if (cantidad > 100) {
        return alert('⚠️ Máximo 100 cartones por lote');
    }

    const updates = {};
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'carton-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
        const carton = generarCartonBingo();
        
        updates[`salas/${CONFIG.SALA_ID}/cartones/${id}`] = {
            id: id,
            nombre: `Cartón #${generados(i)}`,
            carton: carton,
            estado: 'disponible',
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
            fechaModificacion: firebase.database.ServerValue.TIMESTAMP
        };
    }
    
    db.ref().update(updates)
        .then(() => {
            console.log(`✅ ${cantidad} cartones generados`);
            input.value = '';
            mostrarToast(`✅ ${cantidad} cartones generados correctamente`);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            alert('Error al generar cartones');
        });
    
    function generados(index) {
        return index + 1;
    }
};

// ============ RENOMBRAR ============
window.renombrarCarton = function(id, nuevoNombre) {
    if (!nuevoNombre || nuevoNombre.trim() === '') {
        return alert('❌ El nombre no puede estar vacío');
    }
    
    db.ref(`salas/${CONFIG.SALA_ID}/cartones/${id}`).update({ 
        nombre: nuevoNombre.trim(),
        fechaModificacion: firebase.database.ServerValue.TIMESTAMP
    });
};

// ============ CAMBIAR ESTADO ============
window.cambiarEstado = function(id, nuevoEstado) {
    const estadosValidos = ['disponible', 'asignado', 'usado'];
    if (!estadosValidos.includes(nuevoEstado)) return;
    
    db.ref(`salas/${CONFIG.SALA_ID}/cartones/${id}`).update({ 
        estado: nuevoEstado,
        fechaModificacion: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        mostrarToast(`Estado: ${nuevoEstado}`);
    });
};

// ============ VISTA PREVIA ============
window.verVistaPrevia = function(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;

    db.ref(`salas/${CONFIG.SALA_ID}/cartones/${id}`).once('value', (snap) => {
        const data = snap.val();
        if (data && data.carton) {
            preview.innerHTML = generarHTMLCartonDetalle(data);
            
            // Marcar como seleccionado
            document.querySelectorAll('.card-carton').forEach(card => {
                card.classList.remove('seleccionado');
            });
            const cardSeleccionada = document.querySelector(`[data-id="${id}"]`);
            if (cardSeleccionada) {
                cardSeleccionada.classList.add('seleccionado');
            }
        } else {
            preview.innerHTML = '<p style="color:red">❌ Cartón no encontrado</p>';
        }
    });
};

function generarHTMLCartonDetalle(data) {
    const { nombre, id, carton, estado } = data;
    
    const estadosEmoji = {
        'disponible': '🟢',
        'asignado': '🟡',
        'usado': '🔴'
    };
    
    let html = `
        <div style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h2 style="color:#1e293b; margin:0;">${nombre}</h2>
                    <p style="color:#64748b; margin:5px 0;">ID: ${id}</p>
                    <p style="margin:5px 0;">${estadosEmoji[estado] || ''} Estado: <strong>${estado}</strong></p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.exportarPDFCarton('${id}')" 
                            style="background:#8b5cf6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer;">
                        📄 PDF
                    </button>
                    <button onclick="window.copiarLinkCarton('${id}')" 
                            style="background:#3b82f6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer;">
                        🔗 Copiar Link
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom:20px; display:flex; gap:10px;">
                <button onclick="window.cambiarEstado('${id}', 'disponible')" 
                        style="background:${estado === 'disponible' ? '#10b981' : '#e2e8f0'}; 
                               color:${estado === 'disponible' ? 'white' : '#64748b'}; 
                               border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                    🟢 Disponible
                </button>
                <button onclick="window.cambiarEstado('${id}', 'asignado')" 
                        style="background:${estado === 'asignado' ? '#f59e0b' : '#e2e8f0'}; 
                               color:${estado === 'asignado' ? 'white' : '#64748b'}; 
                               border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                    🟡 Asignado
                </button>
                <button onclick="window.cambiarEstado('${id}', 'usado')" 
                        style="background:${estado === 'usado' ? '#ef4444' : '#e2e8f0'}; 
                               color:${estado === 'usado' ? 'white' : '#64748b'}; 
                               border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                    🔴 Usado
                </button>
            </div>
            
            <table style="width:100%; border-collapse:collapse; margin:0 auto;">
                <tr style="background:#ff4d4d; color:white;">
                    <th style="padding:15px;">B</th>
                    <th style="padding:15px;">I</th>
                    <th style="padding:15px;">N</th>
                    <th style="padding:15px;">G</th>
                    <th style="padding:15px;">O</th>
                </tr>
    `;
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += `<td style="padding:15px; border:2px solid #e2e8f0; text-align:center; font-size:1.2rem; font-weight:bold;
                           ${esCentro ? 'background:#fef3c7;' : ''}">
                           ${esCentro ? '⭐' : valor}</td>`;
        });
        html += '</tr>';
    }
    
    html += '</table></div>';
    return html;
}

// ============ SINCRONIZACIÓN ============
function cargarCartones() {
    db.ref(`salas/${CONFIG.SALA_ID}/cartones`).on('value', (snapshot) => {
        const btnContador = document.getElementById('contadorRegistrados');
        const total = snapshot.numChildren() || 0;
        if (btnContador) {
            btnContador.innerHTML = `🎫 CARTONES: ${total}`;
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
    
    const filtro = document.getElementById('buscadorCartones')?.value?.toLowerCase() || '';
    
    cartones
        .sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0))
        .filter(carton => {
            if (!filtro) return true;
            const nombre = (carton.nombre || '').toLowerCase();
            const id = (carton.id || '').toLowerCase();
            return nombre.includes(filtro) || id.includes(filtro);
        })
        .forEach(carton => {
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', carton.id);
            div.onclick = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                window.verVistaPrevia(carton.id);
            };
            
            const estadoClass = `estado-${carton.estado || 'disponible'}`;
            
            div.innerHTML = `
                <div class="carton-header">
                    <span class="carton-id">#${carton.id.slice(-8)}</span>
                    <span class="carton-estado ${estadoClass}">${carton.estado || 'disponible'}</span>
                </div>
                <input 
                    type="text" 
                    class="input-nombre-carton" 
                    value="${carton.nombre || ''}" 
                    onchange="window.renombrarCarton('${carton.id}', this.value)"
                    onclick="event.stopPropagation()"
                    placeholder="Nombre del cartón...">
                <div class="carton-acciones">
                    <button class="btn-accion-pequeno link" 
                            onclick="event.stopPropagation(); window.copiarLinkCarton('${carton.id}')">
                        🔗
                    </button>
                    <button class="btn-accion-pequeno pdf" 
                            onclick="event.stopPropagation(); window.exportarPDFCarton('${carton.id}')">
                        📄
                    </button>
                    <button class="btn-accion-pequeno eliminar" 
                            onclick="event.stopPropagation(); window.eliminarCarton('${carton.id}')">
                        🗑️
                    </button>
                </div>
            `;
            contenedor.appendChild(div);
        });
}

// ============ FILTRAR ============
window.filtrarCartones = function(filtro) {
    const contenedor = document.getElementById('listaCartones');
    const cards = contenedor.querySelectorAll('.card-carton');
    
    cards.forEach(card => {
        const nombre = card.querySelector('.input-nombre-carton').value.toLowerCase();
        const id = card.getAttribute('data-id').toLowerCase();
        const filtroLower = filtro.toLowerCase();
        
        card.style.display = (nombre.includes(filtroLower) || id.includes(filtroLower)) ? '' : 'none';
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
    const baseUrl = `${window.location.origin}${window.location.pathname.replace('generar.html', '')}`;
    return `${baseUrl}carton.html?carton=${id}&sala=${CONFIG.SALA_ID}`;
}

// ============ ELIMINAR ============
window.eliminarCarton = function(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref(`salas/${CONFIG.SALA_ID}/cartones/${id}`).remove()
            .then(() => mostrarToast('🗑️ Cartón eliminado'));
    }
};

window.borrarTodo = function() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref(`salas/${CONFIG.SALA_ID}/cartones`).remove()
            .then(() => {
                document.getElementById('vista-previa-contenido').innerHTML = 
                    '<div class="preview-empty"><h2>✅ Todos los cartones eliminados</h2></div>';
                mostrarToast('🗑️ Todos los cartones eliminados');
            });
    }
};

// ============ EXPORTAR / IMPORTAR ============
window.exportarJSON = function() {
    db.ref(`salas/${CONFIG.SALA_ID}/cartones`).once('value', (snap) => {
        if (!snap.exists()) {
            return alert('No hay cartones para exportar');
        }
        
        const data = {
            version: '1.0',
            salaId: CONFIG.SALA_ID,
            fechaExportacion: new Date().toISOString(),
            cartones: snap.val()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cartones-bingo-${CONFIG.SALA_ID}.json`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarToast('💾 Cartones exportados');
    });
};

window.importarJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.cartones) throw new Error('Formato inválido');
            
            const cantidad = Object.keys(data.cartones).length;
            if (!confirm(`¿Importar ${cantidad} cartones?`)) return;
            
            const updates = {};
            Object.entries(data.cartones).forEach(([id, carton]) => {
                updates[`salas/${CONFIG.SALA_ID}/cartones/${id}`] = carton;
            });
            
            db.ref().update(updates)
                .then(() => mostrar
