// generar.js - Generador de Cartones de Bingo
// La configuración de Firebase ya está en el HTML

// ============ CONFIGURACIÓN DE SALA ============
const SALA_ID = localStorage.getItem('salaActiva') || generarSalaNueva();

function generarSalaNueva() {
    const salaId = 'sala-' + Date.now().toString(36);
    localStorage.setItem('salaActiva', salaId);
    return salaId;
}

// ============ GENERADOR DE CARTÓN ============
function generarCartonBingo() {
    return {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75)
    };
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
    numeros[2] = '⭐';
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
    
    console.log('🎲 Generando ' + cantidad + ' cartones...');
    mostrarToast('⏳ Generando ' + cantidad + ' cartones...');
    
    let completados = 0;
    let errores = 0;
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'carton-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const carton = generarCartonBingo();
        
        const datosCarton = {
            id: id,
            nombre: 'Cartón ' + (i + 1),
            carton: carton,
            estado: 'disponible',
            creado: firebase.database.ServerValue.TIMESTAMP
        };
        
        db.ref('salas/' + SALA_ID + '/cartones/' + id)
            .set(datosCarton)
            .then(() => {
                completados++;
                if (completados === cantidad) {
                    console.log('✅ Todos los cartones generados: ' + completados);
                    mostrarToast('✅ ' + completados + ' cartones generados');
                }
            })
            .catch(error => {
                errores++;
                console.error('❌ Error:', error);
                if (errores === 1) {
                    mostrarToast('❌ Error al generar cartones', 'error');
                }
            });
    }
    
    input.value = '';
}

// ============ VISTA PREVIA ============
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
                
                document.querySelectorAll('.card-carton').forEach(c => {
                    c.classList.remove('seleccionado');
                });
                const card = document.querySelector('[data-id="' + id + '"]');
                if (card) card.classList.add('seleccionado');
            } else {
                preview.innerHTML = '<p style="color:red;">❌ Cartón no encontrado</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            preview.innerHTML = '<p style="color:red;">❌ Error al cargar cartón</p>';
        });
}

function generarHTMLCarton(datos) {
    const nombre = datos.nombre || 'Sin nombre';
    const id = datos.id || '';
    const carton = datos.carton;
    const estado = datos.estado || 'disponible';
    
    let html = '<div style="padding:20px;">';
    html += '<h2 style="color:#1e293b; margin-bottom:5px;">' + nombre + '</h2>';
    html += '<p style="color:#64748b; font-size:0.8rem;">ID: ' + id + '</p>';
    html += '<p style="color:#64748b; font-size:0.8rem;">Estado: <strong>' + estado + '</strong></p>';
    
    html += '<table style="width:100%; border-collapse:collapse; margin:20px auto; max-width:350px;">';
    html += '<tr style="background:#ff4d4d; color:white;">';
    html += '<th style="padding:10px;">B</th><th style="padding:10px;">I</th><th style="padding:10px;">N</th><th style="padding:10px;">G</th><th style="padding:10px;">O</th>';
    html += '</tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:10px; border:2px solid #e2e8f0; text-align:center; font-weight:bold;';
            if (esCentro) html += 'background:#fef3c7;';
            html += '">' + valor + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table>';
    
    html += '<div style="margin-top:15px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">';
    html += '<button onclick="copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔗 Copiar Link</button>';
    html += '<button onclick="cambiarEstadoCarton(\'' + id + '\')" style="background:#f59e0b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔄 Estado</button>';
    html += '<button onclick="eliminarCarton(\'' + id + '\')" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🗑️ Eliminar</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

// ============ RENOMBRAR ============
function renombrarCarton(id, nombre) {
    if (nombre && nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({
            nombre: nombre.trim()
        });
    }
}

// ============ CAMBIAR ESTADO ============
function cambiarEstadoCarton(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
        const datos = snap.val();
        const estadoActual = datos.estado || 'disponible';
        const estados = ['disponible', 'asignado', 'usado'];
        const indiceActual = estados.indexOf(estadoActual);
        const nuevoEstado = estados[(indiceActual + 1) % estados.length];
        
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({
            estado: nuevoEstado
        }).then(() => {
            mostrarToast('Estado: ' + nuevoEstado);
            verVistaPrevia(id);
        });
    });
}

// ============ LINKS ============
function copiarLinkCarton(id) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    const link = baseUrl + 'carton.html?carton=' + id + '&sala=' + SALA_ID;
    
    navigator.clipboard.writeText(link).then(() => {
        mostrarToast('✅ Link copiado');
    }).catch(() => {
        prompt('Copia este link:', link);
    });
}

// ============ ELIMINAR ============
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
                document.getElementById('vista-previa-contenido').innerHTML = 
                    '<div class="preview-empty"><h2>✅ Todos eliminados</h2></div>';
                mostrarToast('🗑️ Todos eliminados');
            });
    }
}

// ============ EXPORTAR ============
function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            alert('No hay cartones para exportar');
            return;
        }
        
        const data = {
            version: '1.0',
            salaId: SALA_ID,
            fecha: new Date().toISOString(),
            cartones: snap.val()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cartones-bingo-' + SALA_ID + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        mostrarToast('💾 Exportado correctamente');
    });
}

// ============ IMPORTAR ============
function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.cartones) {
                throw new Error('Formato inválido');
            }
            
            const cantidad = Object.keys(data.cartones).length;
            
            if (confirm('¿Importar ' + cantidad + ' cartones?')) {
                const updates = {};
                Object.keys(data.cartones).forEach(key => {
                    updates['salas/' + SALA_ID + '/cartones/' + key] = data.cartones[key];
                });
                
                db.ref().update(updates)
                    .then(() => mostrarToast('✅ ' + cantidad + ' importados'))
                    .catch(err => {
                        console.error(err);
                        alert('Error al importar');
                    });
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============ VER LINKS ============
function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            preview.innerHTML = '<div class="preview-empty"><h2>📋 Sin cartones</h2></div>';
            return;
        }
        
        let html = '<h2 style="color:#ff4d4d; margin-bottom:15px;">🔗 LINKS</h2>';
        html += '<div style="max-height:500px; overflow-y:auto; text-align:left;">';
        
        const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
        
        snap.forEach(child => {
            const carton = child.val();
            const link = baseUrl + 'carton.html?carton=' + carton.id + '&sala=' + SALA_ID;
            
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px;">';
            html += '<strong>' + (carton.nombre || 'Sin nombre') + '</strong><br>';
            html += '<div style="display:flex; gap:5px; margin-top:5px;">';
            html += '<input value="' + link + '" readonly style="flex:1; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;" onclick="this.select()">';
            html += '<button onclick="copiarLinkCarton(\'' + carton.id + '\')" style="background:#3b82f6; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">📋</button>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        preview.innerHTML = html;
    });
}

// ============ SELECCIONAR TODOS ============
function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todasSeleccionadas = Array.from(cards).every(c => c.classList.contains('seleccionado'));
    
    cards.forEach(card => {
        if (todasSeleccionadas) {
            card.classList.remove('seleccionado');
        } else {
            card.classList.add('seleccionado');
        }
    });
}

// ============ FILTRAR ============
function filtrarCartones(texto) {
    const filtro = texto.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(card => {
        const nombre = (card.querySelector('.input-nombre-carton')?.value || '').toLowerCase();
        const id = (card.getAttribute('data-id') || '').toLowerCase();
        card.style.display = (nombre.includes(filtro) || id.includes(filtro)) ? '' : 'none';
    });
}

// ============ TOAST ============
function mostrarToast(mensaje, tipo) {
    const toastAnterior = document.querySelector('.toast');
    if (toastAnterior) toastAnterior.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    
    if (tipo === 'error') {
        toast.style.background = '#ef4444';
    }
    
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
    const refCartones = db.ref('salas/' + SALA_ID + '/cartones');
    
    refCartones.on('value', snapshot => {
        // Contador
        const total = snapshot.numChildren() || 0;
        const contador = document.getElementById('contadorRegistrados');
        if (contador) {
            contador.innerHTML = '🎫 CARTONES: ' + total;
        }
        
        // Lista
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados aún</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        
        const cartones = [];
        snapshot.forEach(child => {
            cartones.push({ key: child.key, ...child.val() });
        });
        
        cartones.sort((a, b) => (b.creado || 0) - (a.creado || 0));
        
        cartones.forEach(carton => {
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', carton.key);
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verVistaPrevia(carton.key);
            };
            
            const estado = carton.estado || 'disponible';
            const estadoClass = 'estado-' + estado;
            const idCorto = (carton.key || '').slice(-8);
            
            div.innerHTML = 
                '<div class="carton-header">' +
                    '<span class="carton-id">#' + idCorto + '</span>' +
                    '<span class="carton-estado ' + estadoClass + '">' + estado + '</span>' +
                '</div>' +
                '<input type="text" class="input-nombre-carton" value="' + (carton.nombre || '') + '" ' +
                    'onchange="renombrarCarton(\'' + carton.key + '\', this.value)" ' +
                    'onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
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
    console.log('🎮 Bingo Admin - Generador de Cartones');
    console.log('📁 Sala activa: ' + SALA_ID);
    
    // Configurar botones
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', function() {
        mostrarToast('📄 Función en desarrollo');
    });
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnSelTodos').addEventListener('click', seleccionarTodos);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() {
        window.location.href = 'ruleta.html';
    });
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    
    // Enter para generar
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    // Iniciar sincronización
    iniciarSincronizacion();
    
    // Verificar conexión
    db.ref('.info/connected').on('value', function(snap) {
        console.log(snap.val() ? '🟢 Conectado' : '🔴 Desconectado');
    });
});
