// generar.js - Versión final corregida

const SALA_ID = localStorage.getItem('salaActiva') || 'sala-' + Date.now().toString(36);
localStorage.setItem('salaActiva', SALA_ID);

let seleccionados = new Set();

// ============ GENERAR COLUMNA ============
function generarColumna(min, max) {
    const nums = [];
    while (nums.length < 5) {
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
}

// ============ GENERAR CARTÓN ============
function generarCarton() {
    const c = {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75)
    };
    c.N[2] = 'FREE';
    return c;
}

// ============ ACTUALIZAR BOTÓN ASIGNAR ============
function actualizarBtnAsignar() {
    const btn = document.getElementById('btnAsignar');
    if (btn) {
        if (seleccionados.size > 0) {
            btn.textContent = '👤 ASIGNAR (' + seleccionados.size + ')';
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }
}

// ============ MOSTRAR LISTA ============
function mostrarLista() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        contenedor.innerHTML = '';
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados aún</p>';
            return;
        }
        
        const cartones = [];
        snap.forEach(function(child) {
            cartones.push({ key: child.key, data: child.val() });
        });
        
        cartones.sort(function(a, b) {
            return (a.data.numero || 0) - (b.data.numero || 0);
        });
        
        cartones.forEach(function(item) {
            const c = item.data;
            const id = item.key;
            const estaSeleccionado = seleccionados.has(id);
            
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', id);
            if (estaSeleccionado) div.classList.add('seleccionado');
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verPreview(id);
            };
            
            div.innerHTML = 
                '<div class="carton-header">' +
                '<span class="carton-id"># ' + (c.numero || '?') + '</span>' +
                '<span class="carton-estado estado-' + (c.estado || 'disponible') + '">' + (c.estado || 'disponible') + '</span>' +
                '</div>' +
                (c.asignadoA ? '<div class="carton-asignado">👤 ' + c.asignadoA + '</div>' : '') +
                '<input type="text" class="input-nombre-carton" value="' + (c.nombre || '') + '" ' +
                'onchange="renombrarCarton(\'' + id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
                '<button class="btn-accion-pequeno seleccionar' + (estaSeleccionado ? ' activo' : '') + '" ' +
                'onclick="event.stopPropagation(); toggleSeleccion(\'' + id + '\')">' + (estaSeleccionado ? '✓' : '○') + '</button>' +
                '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLink(\'' + id + '\')">🔗</button>' +
                '<button class="btn-accion-pequeno estado-btn" onclick="event.stopPropagation(); cambiarEstado(\'' + id + '\')">🔄</button>' +
                '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + id + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
        
        actualizarBtnAsignar();
    });
}

// ============ TOGGLE SELECCIÓN ============
function toggleSeleccion(id) {
    if (seleccionados.has(id)) {
        seleccionados.delete(id);
    } else {
        seleccionados.add(id);
    }
    mostrarLista();
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('Ingresa un número entre 1 y 100');
        return;
    }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let maxNum = 0;
        snap.forEach(function(child) {
            const num = child.val().numero || 0;
            if (num > maxNum) maxNum = num;
        });
        
        let creados = 0;
        
        for (let i = 0; i < cantidad; i++) {
            const nuevoNum = maxNum + i + 1;
            const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5);
            const carton = generarCarton();
            
            db.ref('salas/' + SALA_ID + '/cartones/' + id).set({
                id: id,
                numero: nuevoNum,
                nombre: 'Cartón ' + nuevoNum,
                carton: carton,
                estado: 'disponible',
                asignadoA: '',
                creado: Date.now()
            }, function(error) {
                if (!error) {
                    creados++;
                    if (creados === cantidad) {
                        mostrarLista();
                        input.value = '';
                    }
                }
            });
        }
    });
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    if (seleccionados.size === 0) {
        alert('Selecciona al menos un cartón');
        return;
    }
    
    const nombre = prompt('👤 Nombre del jugador:');
    if (!nombre || !nombre.trim()) return;
    
    const nombreJugador = nombre.trim();
    const ids = Array.from(seleccionados);
    let completados = 0;
    
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({
            estado: 'asignado',
            asignadoA: nombreJugador
        }, function(error) {
            if (!error) {
                completados++;
                if (completados === ids.length) {
                    seleccionados.clear();
                    mostrarLista();
                    
                    const link = generarLinkJugador(nombreJugador, ids);
                    mostrarAsignacionExitosa(nombreJugador, ids, link);
                }
            }
        });
    });
}

function generarLinkJugador(nombre, ids) {
    const base = location.origin + location.pathname.replace('generar.html', '');
    return base + 'jugador.html?nombre=' + encodeURIComponent(nombre) + '&cartones=' + ids.join(',') + '&sala=' + SALA_ID;
}

function mostrarAsignacionExitosa(nombre, ids, link) {
    const preview = document.getElementById('vista-previa-contenido');
    
    let html = '<div style="padding:15px;">';
    html += '<h3 style="color:#10b981; margin-bottom:5px;">✅ Cartones Asignados</h3>';
    html += '<p style="font-size:1.1rem; color:#1e293b;"><strong>👤 ' + nombre + '</strong></p>';
    html += '<p style="color:#64748b; font-size:0.85rem;">' + ids.length + ' cartón(es) asignado(s)</p>';
    
    html += '<div style="background:#f1f5f9; padding:10px; border-radius:8px; margin:10px 0;">';
    html += '<p style="color:#64748b; font-size:0.75rem; margin-bottom:5px;">🔗 Link del jugador:</p>';
    html += '<div style="display:flex; gap:8px;">';
    html += '<input id="linkJugadorInput" value="' + link + '" readonly style="flex:1; padding:8px; border:2px solid #3b82f6; border-radius:6px; font-size:0.8rem;" onclick="this.select()">';
    html += '<button onclick="copiarLinkJugador()" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem;">📋</button>';
    html += '</div></div>';
    
    html += '<button onclick="verCartonesJugador(\'' + nombre + '\', ' + JSON.stringify(ids) + ')" style="background:#8b5cf6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">📄 Ver Cartones</button>';
    html += '</div>';
    
    preview.innerHTML = html;
}

function copiarLinkJugador() {
    const input = document.getElementById('linkJugadorInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(function() {
            mostrarToast('✅ Link copiado');
        });
    }
}

// ============ BUSCAR JUGADOR Y SELECCIONAR SUS CARTONES ============
function buscarJugador() {
    const nombre = prompt('🔍 Nombre del jugador a buscar:');
    if (!nombre || !nombre.trim()) return;
    
    const nombreBuscado = nombre.trim().toLowerCase();
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        seleccionados.clear();
        let encontrados = 0;
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA && c.asignadoA.toLowerCase() === nombreBuscado) {
                seleccionados.add(c.id);
                encontrados++;
            }
        });
        
        if (encontrados > 0) {
            mostrarLista();
            
            // Generar link con todos los cartones del jugador
            const ids = Array.from(seleccionados);
            const link = generarLinkJugador(nombre.trim(), ids);
            
            const preview = document.getElementById('vista-previa-contenido');
            preview.innerHTML = 
                '<div style="padding:15px;">' +
                '<h3 style="color:#3b82f6;">🔍 Jugador encontrado</h3>' +
                '<p style="font-size:1.1rem;"><strong>👤 ' + nombre.trim() + '</strong></p>' +
                '<p style="color:#64748b;">' + encontrados + ' cartón(es) seleccionado(s)</p>' +
                '<div style="background:#f1f5f9; padding:10px; border-radius:8px; margin:10px 0;">' +
                '<p style="color:#64748b; font-size:0.75rem; margin-bottom:5px;">🔗 Link del jugador:</p>' +
                '<div style="display:flex; gap:8px;">' +
                '<input id="linkJugadorInput" value="' + link + '" readonly style="flex:1; padding:8px; border:2px solid #3b82f6; border-radius:6px; font-size:0.8rem;" onclick="this.select()">' +
                '<button onclick="copiarLinkJugador()" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem;">📋</button>' +
                '</div></div>' +
                '<button onclick="verCartonesJugador(\'' + nombre.trim() + '\', ' + JSON.stringify(ids) + ')" style="background:#8b5cf6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:0.85rem;">📄 Ver Cartones</button>' +
                '</div>';
        } else {
            alert('❌ No se encontraron cartones para: ' + nombre.trim());
        }
    });
}

// ============ VER CARTONES DEL JUGADOR ============
function verCartonesJugador(nombre, ids) {
    const preview = document.getElementById('vista-previa-contenido');
    
    let html = '<div style="padding:15px;">';
    html += '<h3 style="color:#1e293b; margin-bottom:5px;">👤 ' + nombre + '</h3>';
    html += '<p style="color:#64748b; font-size:0.85rem;">' + ids.length + ' cartón(es)</p>';
    html += '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:10px; max-height:60vh; overflow-y:auto;">';
    
    let cargados = 0;
    
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
            const d = snap.val();
            if (d && d.carton) {
                html += '<div style="border:2px solid #e2e8f0; border-radius:8px; padding:8px;">';
                html += '<h4 style="text-align:center; color:#ff4d4d; margin-bottom:5px; font-size:0.85rem;">Cartón #' + d.numero + '</h4>';
                html += '<table style="width:100%; border-collapse:collapse; font-size:0.7rem;">';
                html += '<tr style="background:#ff4d4d; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
                
                for (let f = 0; f < 5; f++) {
                    html += '<tr>';
                    ['B','I','N','G','O'].forEach(function(l) {
                        const v = d.carton[l][f];
                        const centro = (l === 'N' && f === 2);
                        html += '<td style="padding:4px; border:1px solid #e2e8f0; text-align:center;';
                        if (centro) html += 'background:#fef3c7;';
                        html += '">' + (centro ? '⭐' : v) + '</td>';
                    });
                    html += '</tr>';
                }
                html += '</table></div>';
            }
            
            cargados++;
            if (cargados === ids.length) {
                html += '</div></div>';
                preview.innerHTML = html;
            }
        });
    });
}

// ============ VISTA PREVIA INDIVIDUAL ============
function verPreview(id) {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val();
        if (!d || !d.carton) {
            preview.innerHTML = '<p>No encontrado</p>';
            return;
        }
        
        let html = '<div style="padding:15px;">';
        html += '<h3 style="color:#1e293b; margin-bottom:5px;">Cartón #' + d.numero + '</h3>';
        if (d.nombre && d.nombre !== 'Cartón ' + d.numero) {
            html += '<p style="color:#64748b; font-size:0.85rem;">' + d.nombre + '</p>';
        }
        html += '<p style="color:#64748b; font-size:0.8rem;">Estado: <strong>' + (d.estado || 'disponible') + '</strong></p>';
        if (d.asignadoA) {
            html += '<p style="color:#10b981; font-size:0.85rem;">👤 <strong>' + d.asignadoA + '</strong></p>';
        }
        
        html += '<table style="width:100%; border-collapse:collapse; max-width:300px; margin:10px auto;">';
        html += '<tr style="background:#ff4d4d; color:white;"><th style="padding:8px;">B</th><th style="padding:8px;">I</th><th style="padding:8px;">N</th><th style="padding:8px;">G</th><th style="padding:8px;">O</th></tr>';
        
        for (let f = 0; f < 5; f++) {
            html += '<tr>';
            ['B','I','N','G','O'].forEach(function(l) {
                const v = d.carton[l][f];
                const centro = (l === 'N' && f === 2);
                html += '<td style="padding:8px; border:2px solid #e2e8f0; text-align:center; font-weight:bold;';
                if (centro) html += 'background:#fef3c7;';
                html += '">' + (centro ? '⭐' : v) + '</td>';
            });
            html += '</tr>';
        }
        html += '</table>';
        
        html += '<div style="margin-top:10px; display:flex; gap:6px; justify-content:center;">';
        html += '<button onclick="copiarLink(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">🔗 Link</button>';
        html += '<button onclick="cambiarEstado(\'' + id + '\')" style="background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">🔄 Estado</button>';
        html += '</div>';
        
        html += '</div>';
        preview.innerHTML = html;
    });
}

// ============ FUNCIONES AUXILIARES ============
function renombrarCarton(id, nombre) {
    if (nombre && nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

function cambiarEstado(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const estados = ['disponible', 'asignado', 'usado'];
        const actual = estados.indexOf(snap.val().estado || 'disponible');
        const nuevo = estados[(actual + 1) % 3];
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ estado: nuevo }, function() {
            mostrarLista();
            verPreview(id);
        });
    });
}

function copiarLink(id) {
    const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + id + '&sala=' + SALA_ID;
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link copiado');
    });
}

function eliminarCarton(id) {
    if (confirm('¿Eliminar este cartón?')) {
        seleccionados.delete(id);
        db.ref('salas/' + SALA_ID + '/cartones/' + id).remove(function() {
            mostrarLista();
        });
    }
}

function borrarTodo() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        seleccionados.clear();
        db.ref('salas/' + SALA_ID + '/cartones').remove(function() {
            document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>✅ Eliminados</h2></div>';
            mostrarLista();
        });
    }
}

function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const data = { sala: SALA_ID, cartones: snap.val() || {} };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones-' + SALA_ID + '.json';
        a.click();
    });
}

function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const data = JSON.parse(ev.target.result);
        if (data.cartones) {
            db.ref('salas/' + SALA_ID + '/cartones').set(data.cartones, function() {
                mostrarLista();
            });
        }
    };
    reader.readAsText(file);
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let html = '<h3 style="color:#ff4d4d; margin-bottom:10px;">🔗 LINKS</h3><div style="max-height:60vh; overflow-y:auto; text-align:left;">';
        const base = location.origin + location.pathname.replace('generar.html', '');
        snap.forEach(function(child) {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:8px; margin:4px 0; border-radius:6px;">';
            html += '<strong>#' + c.numero + '</strong> - ' + (c.nombre || '') + (c.asignadoA ? ' <span style="color:#10b981;">(' + c.asignadoA + ')</span>' : '');
            html += '<input value="' + link + '" readonly style="width:100%; padding:4px; margin-top:4px; font-size:0.75rem;" onclick="this.select()">';
            html += '</div>';
        });
        html += '</div>';
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todasSeleccionadas = Array.from(cards).every(function(c) {
        return c.classList.contains('seleccionado');
    });
    
    cards.forEach(function(card) {
        const id = card.getAttribute('data-id');
        if (todasSeleccionadas) {
            seleccionados.delete(id);
        } else {
            seleccionados.add(id);
        }
    });
    
    mostrarLista();
}

function filtrarCartones(t) {
    const f = t.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(function(c) {
        c.style.display = c.textContent.toLowerCase().includes(f) ? '' : 'none';
    });
}

function mostrarToast(mensaje) {
    const t = document.querySelector('.toast');
    if (t) t.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2000);
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bingo Pro Admin');
    console.log('📁 Sala: ' + SALA_ID);
    
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', function() {
        alert('📄 Función PDF en desarrollo');
    });
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnSelTodos').addEventListener('click', seleccionarTodos);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() {
        location.href = 'ruleta.html';
    });
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    window.asignarAJugador = asignarAJugador;
    window.buscarJugador = buscarJugador;
    
    mostrarLista();
});
