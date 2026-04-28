// generar.js - Lógica principal del generador de cartones
// Versión completa y corregida

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

// ============ FUNCIÓN PRINCIPAL: GENERAR LOTE ============
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
    }
    
    db.ref().update(updates)
        .then(() => {
            console.log('✅ ' + cantidad + ' cartones generados');
            input.value = '';
            mostrarToast('✅ ' + cantidad + ' cartones generados correctamente');
        })
        .catch(error => {
            console.error('❌ Error:', error);
            mostrarToast('Error al generar cartones', 'error');
        });
};

// ============ RENOMBRAR CARTÓN ============
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

// ============ CAMBIAR ESTADO DEL CARTÓN ============
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

// ============ VISTA PREVIA DEL CARTÓN ============
window.verVistaPrevia = function(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;

    db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const data = snap.val();
        if (data && data.carton) {
            preview.innerHTML = generarHTMLCartonDetalle(data);
            
            // Marcar como seleccionado en la lista
            document.querySelectorAll('.card-carton').forEach(function(card) {
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
    
    // Cabecera con información
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">';
    html += '<div>';
    html += '<h2 style="color:#1e293b; margin:0;">' + nombre + '</h2>';
    html += '<p style="color:#64748b; margin:5px 0;">ID: ' + id + '</p>';
    html += '<p style="margin:5px 0;">' + (estadosEmoji[estado] || '') + ' Estado: <strong>' + estado + '</strong></p>';
    html += '</div>';
    
    // Botones de acción
    html += '<div style="display:flex; gap:10px;">';
    html += '<button onclick="window.exportarPDFCarton(\'' + id + '\')" style="background:#8b5cf6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-size:0.9rem;">📄 PDF</button>';
    html += '<button onclick="window.copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-size:0.9rem;">🔗 Copiar Link</button>';
    html += '</div>';
    html += '</div>';
    
    // Selector de estado
    html += '<div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap;">';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'disponible\')" style="background:' + (estado === 'disponible' ? '#10b981' : '#e2e8f0') + '; color:' + (estado === 'disponible' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🟢 Disponible</button>';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'asignado\')" style="background:' + (estado === 'asignado' ? '#f59e0b' : '#e2e8f0') + '; color:' + (estado === 'asignado' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🟡 Asignado</button>';
    html += '<button onclick="window.cambiarEstado(\'' + id + '\', \'usado\')" style="background:' + (estado === 'usado' ? '#ef4444' : '#e2e8f0') + '; color:' + (estado === 'usado' ? 'white' : '#64748b') + '; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔴 Usado</button>';
    html += '</div>';
    
    // Tabla del cartón
    html += '<table style="width:100%; border-collapse:collapse; margin:0 auto; max-width:500px;">';
    html += '<tr style="background:#ff4d4d; color:white;">';
    html += '<th style="padding:15px; font-size:1.2rem;">B</th>';
    html += '<th style="padding:15px; font-size:1.2rem;">I</th>';
    html += '<th style="padding:15px; font-size:1.2rem;">N</th>';
    html += '<th style="padding:15px; font-size:1.2rem;">G</th>';
    html += '<th style="padding:15px; font-size:1.2rem;">O</th>';
    html += '</tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(function(letra) {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:15px; border:2px solid #e2e8f0; text-align:center; font-size:1.2rem; font-weight:bold;';
            if (esCentro) {
                html += 'background:#fef3c7;';
            }
            html += '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table>';
    html += '</div>';
    
    return html;
}

// ============ SINCRONIZACIÓN DE LA LISTA ============
function cargarCartones() {
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').on('value', function(snapshot) {
        // Actualizar contador
        const btnContador = document.getElementById('contadorRegistrados');
        const total = snapshot.numChildren() || 0;
        if (btnContador) {
            btnContador.innerHTML = '🎫 CARTONES: ' + total;
        }
        
        // Actualizar lista
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
    
    // Convertir a array
    const cartones = [];
    snapshot.forEach(function(child) {
        cartones.push({ id: child.key, ...child.val() });
    });
    
    // Obtener filtro
    const filtroInput = document.getElementById('buscadorCartones');
    const filtro = filtroInput ? filtroInput.value.toLowerCase() : '';
    
    // Ordenar y filtrar
    cartones
        .sort(function(a, b) {
            return (b.fechaCreacion || 0) - (a.fechaCreacion || 0);
        })
        .filter(function(carton) {
            if (!filtro) return true;
            const nombre = (carton.nombre || '').toLowerCase();
            const id = (carton.id || '').toLowerCase();
            return nombre.includes(filtro) || id.includes(filtro);
        })
        .forEach(function(carton) {
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

// ============ FILTRAR CARTONES ============
window.filtrarCartones = function(filtro) {
    const contenedor = document.getElementById('listaCartones');
    if (!contenedor) return;
    
    const cards = contenedor.querySelectorAll('.card-carton');
    const filtroLower = filtro.toLowerCase();
    
    cards.forEach(function(card) {
        const nombreInput = card.querySelector('.input-nombre-carton');
        const nombre = nombreInput ? nombreInput.value.toLowerCase() : '';
        const id = card.getAttribute('data-id').toLowerCase();
        
        if (nombre.includes(filtroLower) || id.includes(filtroLower)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
};

// ============ COPIAR LINK DEL CARTÓN ============
window.copiarLinkCarton = function(id) {
    const link = generarLinkCarton(id);
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link copiado al portapapeles');
    }).catch(function() {
        mostrarToast('❌ Error al copiar', 'error');
    });
};

function generarLinkCarton(id) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    return baseUrl + 'carton.html?carton=' + id + '&sala=' + CONFIG.SALA_ID;
}

// ============ ELIMINAR CARTÓN ============
window.eliminarCarton = function(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).remove()
            .then(function() {
                mostrarToast('🗑️ Cartón eliminado');
            });
    }
};

window.borrarTodo = function() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones').remove()
            .then(function() {
                document.getElementById('vista-previa-contenido').innerHTML = 
                    '<div class="preview-empty"><h2>✅ Todos los cartones eliminados</h2></div>';
                mostrarToast('🗑️ Todos los cartones eliminados');
            });
    }
};

// ============ VER LINKS DE TODOS LOS CARTONES ============
window.verLinks = function() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            preview.innerHTML = '<div class="preview-empty"><h2>📋 Sin cartones</h2><p>No hay cartones para mostrar links</p></div>';
            return;
        }
        
        let html = '<h2 style="color:#ff4d4d; margin-bottom:20px;">🔗 LINKS DE CARTONES</h2>';
        html += '<div style="max-height:500px; overflow-y:auto; text-align:left;">';
        
        snap.forEach(function(child) {
            const carton = child.val();
            const link = generarLinkCarton(carton.id);
            
            html += '<div style="background:#f1f5f9; padding:12px; margin:8px 0; border-radius:8px;">';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
            html += '<strong>' + (carton.nombre || 'Sin nombre') + '</strong>';
            html += '<span style="font-size:0.7rem; color:#64748b;">' + (carton.estado || 'disponible') + '</span>';
            html += '</div>';
            html += '<div style="display:flex; gap:8px;">';
            html += '<input value="' + link + '" readonly style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;" onclick="this.select()">';
            html += '<button onclick="navigator.clipboard.writeText(\'' + link + '\'); mostrarToast(\'✅ Link copiado\')" style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">📋</button>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        preview.innerHTML = html;
    });
};

// ============ SELECCIONAR TODOS ============
window.seleccionarTodos = function() {
    const cards = document.querySelectorAll('.card-carton');
    const todasSeleccionadas = Array.from(cards).every(function(card) {
        return card.classList.contains('seleccionado');
    });
    
    cards.forEach(function(card) {
        if (todasSeleccionadas) {
            card.classList.remove('seleccionado');
            CONFIG.CARTONES_SELECCIONADOS.delete(card.getAttribute('data-id'));
        } else {
            card.classList.add('seleccionado');
            CONFIG.CARTONES_SELECCIONADOS.add(card.getAttribute('data-id'));
        }
    });
    
    mostrarToast(todasSeleccionadas ? 'Selección limpiada' : 'Todos seleccionados');
};

// ============ EXPORTAR JSON ============
window.exportarJSON = function() {
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            mostrarToast('No hay cartones para exportar', 'error');
            return;
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
        a.download = 'cartones-bingo-' + CONFIG.SALA_ID + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarToast('💾 Cartones exportados correctamente');
    });
};

// ============ IMPORTAR JSON ============
window.importarJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.cartones) {
                throw new Error('Formato de archivo inválido');
            }
            
            const cantidad = Object.keys(data.cartones).length;
            if (!confirm('¿Importar ' + cantidad + ' cartones a la sala actual?')) return;
            
            const updates = {};
            Object.entries(data.cartones).forEach(function(entry) {
                const id = entry[0];
                const carton = entry[1];
                updates['salas/' + CONFIG.SALA_ID + '/cartones/' + id] = carton;
            });
            
            db.ref().update(updates)
                .then(function() {
                    mostrarToast('✅ ' + cantidad + ' cartones importados');
                })
                .catch(function(error) {
                    console.error('Error importando:', error);
                    mostrarToast('❌ Error al importar', 'error');
                });
                
        } catch (error) {
            mostrarToast('❌ Error al leer el archivo: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

// ============ EXPORTAR PDF ============
window.exportarPDF = function() {
    mostrarToast('📄 Función PDF en desarrollo. Usa los botones individuales por ahora.', 'error');
};

window.exportarPDFCarton = function(id) {
    mostrarToast('📄 Función PDF en desarrollo. Pronto disponible.', 'error');
};

// ============ TOAST NOTIFICATIONS ============
function mostrarToast(mensaje, tipo) {
    tipo = tipo || 'success';
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    
    if (tipo === 'error') {
        toast.style.background = '#ef4444';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 2000);
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Bingo Admin - Generador de Cartones');
    console.log('📁 Sala activa:', CONFIG.SALA_ID);
    console.log('✅ Funciones disponibles: generarLote, renombrarCarton, cambiarEstado, verVistaPrevia');
    
    // Verificar conexión a Firebase
    db.ref('.info/connected').on('value', function(snap) {
        if (snap.val() === true) {
            console.log('🟢 Conectado a Firebase');
        } else {
            console.warn('🔴 Desconectado de Firebase');
        }
    });
    
    // Cargar cartones existentes
    cargarCartones();
});

// Exponer mostrarToast globalmente
window.mostrarToast = mostrarToast;
