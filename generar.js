// generar.js

const SALA_ID = localStorage.getItem('salaActiva') || ('sala-' + Date.now());
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
            btn.textContent = '👤 ASIGNAR (' + seleccionados.size + ' cartones)';
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    console.log('🟢 Botón ASIGNAR clickeado');
    console.log('Seleccionados:', seleccionados.size);
    
    if (seleccionados.size === 0) {
        alert('Selecciona al menos un cartón');
        return;
    }
    
    if (seleccionados.size > 4) {
        alert('⚠️ Máximo 4 cartones por jugador');
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
    
    let html = '<div style="padding:20px;">';
    html += '<h2 style="color:#10b981;">✅ ¡Asignado!</h2>';
    html += '<h3>👤 ' + nombre + '</h3>';
    html += '<p style="color:#64748b;">' + ids.length + ' cartón(es)</p>';
    
    html += '<div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">';
    html += '<p style="font-size:0.8rem; color:#64748b;">🔗 Link del jugador:</p>';
    html += '<input id="linkJugadorInput" value="' + link + '" readonly style="width:100%; padding:10px; border:2px solid #3b82f6; border-radius:6px; margin-bottom:10px;" onclick="this.select()">';
    html += '<button id="btnCopiarLink" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">📋 COPIAR LINK</button>';
    html += '</div></div>';
    
    preview.innerHTML = html;
    
    // Agregar event listener al botón de copiar
    setTimeout(function() {
        const btnCopiar = document.getElementById('btnCopiarLink');
        if (btnCopiar) {
            btnCopiar.addEventListener('click', function() {
                const input = document.getElementById('linkJugadorInput');
                if (input) {
                    input.select();
                    navigator.clipboard.writeText(input.value).then(function() {
                        btnCopiar.textContent = '✅ COPIADO!';
                        btnCopiar.style.background = '#10b981';
                        setTimeout(function() {
                            btnCopiar.textContent = '📋 COPIAR LINK';
                            btnCopiar.style.background = '#3b82f6';
                        }, 2000);
                    });
                }
            });
        }
    }, 100);
}

// ============ MOSTRAR LISTA ============
function mostrarLista() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        contenedor.innerHTML = '';
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones</p>';
            actualizarBtnAsignar();
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
    console.log('Seleccionados actualizados:', seleccionados.size);
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

// ============ VISTA PREVIA ============
function verPreview(id) {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val();
        if (!d || !d.carton) return;
        
        let html = '<div style="padding:15px;">';
        html += '<h3>Cartón #' + d.numero + '</h3>';
        if (d.asignadoA) html += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        
        html += '<table style="width:100%; border-collapse:collapse; max-width:300px; margin:10px auto;">';
        html += '<tr style="background:#ff4d4d; color:white;"><th style="padding:8px;">B</th><th style="padding:8px;">I</th><th style="padding:8px;">N</th><th style="padding:8px;">G</th><th style="padding:8px;">O</th></tr>';
        
        for (let f = 0; f < 5; f++) {
            html += '<tr>';
            ['B','I','N','G','O'].forEach(function(l) {
                const v = d.carton[l][f];
                const centro = (l === 'N' && f === 2);
                html += '<td style="padding:8px; border:2px solid #e2e8f0; text-align:center;';
                if (centro) html += 'background:#fef3c7;';
                html += '">' + (centro ? '⭐' : v) + '</td>';
            });
            html += '</tr>';
        }
        html += '</table></div>';
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
        mostrarToast('💾 Exportado');
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
                mostrarToast('✅ Importado');
            });
        }
    };
    reader.readAsText(file);
}

function verJugadores() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const jugadores = {};
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA) {
                if (!jugadores[c.asignadoA]) jugadores[c.asignadoA] = [];
                jugadores[c.asignadoA].push({ id: c.id, numero: c.numero });
            }
        });
        
        if (Object.keys(jugadores).length === 0) {
            preview.innerHTML = '<div class="preview-empty"><h3>👥 No hay jugadores</h3></div>';
            return;
        }
        
        let html = '<h3 style="color:#ff4d4d;">👥 JUGADORES</h3><div style="max-height:60vh; overflow-y:auto;">';
        
        Object.keys(jugadores).forEach(function(nombre) {
            const cartones = jugadores[nombre];
            const ids = cartones.map(function(c) { return c.id; });
            const link = generarLinkJugador(nombre, ids);
            
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:8px; text-align:left;">';
            html += '<strong>👤 ' + nombre + '</strong> - ' + cartones.length + ' cart.';
            html += '<input value="' + link + '" readonly style="width:100%; padding:5px; margin-top:5px; font-size:0.75rem;" onclick="this.select()">';
            html += '</div>';
        });
        
        html += '</div>';
        preview.innerHTML = html;
    });
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            preview.innerHTML = '<div class="preview-empty"><h3>📋 Sin cartones</h3></div>';
            return;
        }
        let html = '<h3>🔗 LINKS</h3><div style="max-height:60vh; overflow-y:auto; text-align:left;">';
        const base = location.origin + location.pathname.replace('generar.html', '');
        snap.forEach(function(child) {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:8px; margin:4px 0; border-radius:6px;">';
            html += '<strong>#' + c.numero + '</strong>';
            html += '<input value="' + link + '" readonly style="width:100%; padding:4px; margin-top:4px;" onclick="this.select()">';
            html += '</div>';
        });
        html += '</div>';
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todas = Array.from(cards).every(function(c) { return c.classList.contains('seleccionado'); });
    
    cards.forEach(function(card) {
        const id = card.getAttribute('data-id');
        if (todas) { seleccionados.delete(id); }
        else { seleccionados.add(id); }
    });
    mostrarLista();
}

function filtrarCartones(t) {
    document.querySelectorAll('.card-carton').forEach(function(c) {
        c.style.display = c.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none';
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
    
    // Botones principales
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', function() {
        alert('📄 PDF en desarrollo');
    });
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnJugadores').addEventListener('click', verJugadores);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() {
        location.href = 'ruleta.html';
    });
    
    // ⭐ BOTÓN ASIGNAR - Este es el importante
    document.getElementById('btnAsignar').addEventListener('click', function() {
        console.log('🟢 Click en botón ASIGNAR');
        asignarAJugador();
    });
    
    // File input
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    
    // Buscador
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    
    // Enter para generar
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    mostrarLista();
});
