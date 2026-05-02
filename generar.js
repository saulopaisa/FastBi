// generar.js - Versión con logs de depuración

const SALA_ID = localStorage.getItem('salaActiva') || ('sala-' + Date.now());
localStorage.setItem('salaActiva', SALA_ID);

let seleccionados = new Set();

console.log('📁 Sala ID:', SALA_ID);
console.log('📁 localStorage salaActiva:', localStorage.getItem('salaActiva'));

// Verificar conexión a Firebase
db.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
        console.log('🟢 Conectado a Firebase');
    } else {
        console.log('🔴 Desconectado de Firebase');
    }
});

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

// ============ MOSTRAR LISTA ============
function mostrarLista() {
    console.log('🔄 mostrarLista() llamada');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        console.log('📦 Cartones en Firebase:', total);
        
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
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                '<span style="font-weight:bold; font-size:0.85rem;"># ' + (c.numero || '?') + '</span>' +
                '<span style="font-size:0.65rem; padding:2px 8px; border-radius:12px; background:#dcfce7; color:#166534;">' + (c.estado || 'disp') + '</span>' +
                '</div>' +
                (c.asignadoA ? '<div style="font-size:0.7rem; color:#10b981; margin-bottom:3px;">👤 ' + c.asignadoA + '</div>' : '') +
                '<input type="text" value="' + (c.nombre || '') + '" style="width:100%; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; margin-bottom:3px;" ' +
                'onchange="renombrarCarton(\'' + id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div style="display:flex; gap:3px;">' +
                '<button style="flex:1; padding:4px; background:' + (estaSeleccionado ? '#10b981' : '#6b7280') + '; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.65rem;" ' +
                'onclick="event.stopPropagation(); toggleSeleccion(\'' + id + '\')">' + (estaSeleccionado ? '✓' : '○') + '</button>' +
                '<button style="flex:1; padding:4px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.65rem;" ' +
                'onclick="event.stopPropagation(); copiarLink(\'' + id + '\')">🔗</button>' +
                '<button style="flex:1; padding:4px; background:#f59e0b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.65rem;" ' +
                'onclick="event.stopPropagation(); cambiarEstado(\'' + id + '\')">🔄</button>' +
                '<button style="flex:1; padding:4px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.65rem;" ' +
                'onclick="event.stopPropagation(); eliminarCarton(\'' + id + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
        
        actualizarBtnAsignar();
    });
}

// ============ ACTUALIZAR BOTÓN ASIGNAR ============
function actualizarBtnAsignar() {
    const btn = document.getElementById('btnAsignar');
    console.log('🔘 actualizarBtnAsignar - Seleccionados:', seleccionados.size);
    
    if (btn) {
        if (seleccionados.size > 0) {
            btn.textContent = '👤 ASIGNAR (' + seleccionados.size + ' cartones)';
            btn.style.display = 'block';
            console.log('✅ Botón ASIGNAR visible');
        } else {
            btn.style.display = 'none';
            console.log('❌ Botón ASIGNAR oculto');
        }
    } else {
        console.error('⚠️ No se encontró el botón btnAsignar en el DOM');
    }
}

// ============ TOGGLE SELECCIÓN ============
function toggleSeleccion(id) {
    if (seleccionados.has(id)) {
        seleccionados.delete(id);
        console.log('➖ Quitado de selección:', id);
    } else {
        seleccionados.add(id);
        console.log('➕ Agregado a selección:', id);
    }
    console.log('📋 Total seleccionados:', seleccionados.size);
    mostrarLista();
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    console.log('🎯 asignarAJugador() EJECUTADA');
    console.log('🎯 Seleccionados:', seleccionados.size, Array.from(seleccionados));
    
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
    
    console.log('👤 Asignando a:', nombreJugador, 'Cartones:', ids);
    
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({
            estado: 'asignado',
            asignadoA: nombreJugador
        }, function(error) {
            if (!error) {
                completados++;
                console.log('✅ Actualizado cartón', completados, 'de', ids.length);
                if (completados === ids.length) {
                    seleccionados.clear();
                    mostrarLista();
                    
                    const link = generarLinkJugador(nombreJugador, ids);
                    mostrarAsignacionExitosa(nombreJugador, ids, link);
                }
            } else {
                console.error('❌ Error al actualizar:', error);
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
    html += '<p>' + ids.length + ' cartón(es)</p>';
    html += '<div style="background:#f1f5f9; padding:15px; border-radius:8px; margin-top:15px;">';
    html += '<input id="linkJugadorInput" value="' + link + '" readonly style="width:100%; padding:10px; border:2px solid #3b82f6; border-radius:6px; margin-bottom:10px;" onclick="this.select()">';
    html += '<button id="btnCopiarLink" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold; width:100%;">📋 COPIAR LINK</button>';
    html += '</div></div>';
    
    preview.innerHTML = html;
    
    document.getElementById('btnCopiarLink').addEventListener('click', function() {
        const input = document.getElementById('linkJugadorInput');
        input.select();
        navigator.clipboard.writeText(input.value);
        this.textContent = '✅ COPIADO!';
        this.style.background = '#10b981';
    });
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    console.log('🎲 Generando', cantidad, 'cartones...');
    
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
                    console.log('✅ Creado', creados, '/', cantidad);
                    if (creados === cantidad) {
                        mostrarLista();
                        input.value = '';
                    }
                } else {
                    console.error('❌ Error al crear:', error);
                }
            });
        }
    });
}

// ============ VISTA PREVIA ============
function verPreview(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val();
        if (!d || !d.carton) return;
        
        const preview = document.getElementById('vista-previa-contenido');
        let html = '<div style="padding:15px;">';
        html += '<h3>Cartón #' + d.numero + '</h3>';
        if (d.asignadoA) html += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        
        html += '<table style="width:100%; border-collapse:collapse; max-width:300px; margin:10px auto;">';
        html += '<tr style="background:#ff4d4d; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
        
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
        
        let html = '<h3>👥 JUGADORES</h3>';
        Object.keys(jugadores).forEach(function(nombre) {
            const ids = jugadores[nombre].map(function(c) { return c.id; });
            const link = generarLinkJugador(nombre, ids);
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px; text-align:left;">';
            html += '<strong>👤 ' + nombre + '</strong> - ' + ids.length + ' cart.';
            html += '<input value="' + link + '" readonly style="width:100%; padding:5px; margin-top:5px;" onclick="this.select()">';
            html += '</div>';
        });
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
        let html = '<h3>🔗 LINKS</h3>';
        const base = location.origin + location.pathname.replace('generar.html', '');
        snap.forEach(function(child) {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:8px; margin:4px 0; border-radius:6px; text-align:left;">';
            html += '<strong>#' + c.numero + '</strong>';
            html += '<input value="' + link + '" readonly style="width:100%; padding:4px; margin-top:4px;" onclick="this.select()">';
            html += '</div>';
        });
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
    console.log('🚀 DOM Cargado');
    console.log('📁 Sala:', SALA_ID);
    
    // Verificar que el botón existe
    const btnAsignar = document.getElementById('btnAsignar');
    console.log('🔍 Buscando btnAsignar:', btnAsignar);
    
    // Event listeners
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
    
    // ⭐⭐⭐ BOTÓN ASIGNAR ⭐⭐⭐
    if (btnAsignar) {
        console.log('✅ Botón ASIGNAR encontrado, agregando event listener');
        btnAsignar.addEventListener('click', function() {
            console.log('🟢🟢🟢 CLICK EN ASIGNAR 🟢🟢🟢');
            asignarAJugador();
        });
    } else {
        console.error('❌❌❌ BOTÓN ASIGNAR NO ENCONTRADO ❌❌❌');
    }
    
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    mostrarLista();
});
