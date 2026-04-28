// generar.js - Generador de Cartones de Bingo

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
    return numeros;
}

// ============ GENERAR LOTE (CORREGIDO - UNO POR UNO) ============
async function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('⚠️ Ingresa un número entre 1 y 100');
        return;
    }
    
    console.log('🎲 Generando ' + cantidad + ' cartones...');
    mostrarToast('⏳ Generando ' + cantidad + ' cartones...');
    
    // Obtener el último número de cartón
    const snapshot = await db.ref('salas/' + SALA_ID + '/cartones').once('value');
    let ultimoNumero = 0;
    
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            const num = child.val().numero || 0;
            if (num > ultimoNumero) ultimoNumero = num;
        });
    }
    
    // Generar uno por uno con delay para asegurar timestamps diferentes
    for (let i = 0; i < cantidad; i++) {
        const numero = ultimoNumero + i + 1;
        const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5);
        const carton = generarCartonBingo();
        carton.N[2] = 'FREE';
        
        const datosCarton = {
            id: id,
            numero: numero,
            nombre: 'Cartón ' + numero,
            carton: carton,
            estado: 'disponible',
            asignadoA: '',
            creado: firebase.database.ServerValue.TIMESTAMP
        };
        
        try {
            await db.ref('salas/' + SALA_ID + '/cartones/' + id).set(datosCarton);
            console.log('✅ Cartón #' + numero + ' creado');
        } catch (error) {
            console.error('❌ Error en cartón #' + numero + ':', error);
        }
        
        // Pequeño delay para asegurar timestamps diferentes
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('✅ Total: ' + cantidad + ' cartones generados');
    mostrarToast('✅ ' + cantidad + ' cartones generados');
    input.value = '';
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
        if (cantidad > 0) {
            btnAsignar.textContent = '👤 ASIGNAR (' + cantidad + ')';
            btnAsignar.style.display = 'block';
        } else {
            btnAsignar.style.display = 'none';
        }
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
            const linkJugador = generarLinkJugador(nombreJugador.trim(), cartonesIds);
            
            const preview = document.getElementById('vista-previa-contenido');
            preview.innerHTML = 
                '<div style="padding:20px;">' +
                '<h2 style="color:#10b981;">✅ Cartones asignados</h2>' +
                '<h3 style="color:#1e293b;">' + nombreJugador + '</h3>' +
                '<p style="color:#64748b;">' + cartonesIds.length + ' cartón(es)</p>' +
                '<div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">' +
                '<p style="color:#64748b; font-size:0.8rem;">Link del jugador:</p>' +
                '<div style="display:flex; gap:10px;">' +
                '<input id="linkJugadorInput" value="' + linkJugador + '" readonly style="flex:1; padding:10px; border:2px solid #3b82f6; border-radius:6px; font-size:0.85rem;" onclick="this.select()">' +
                '<button onclick="copiarLinkJugador()" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">📋</button>' +
                '</div>' +
                '</div>' +
                '</div>';
            
            cartonesSeleccionados.clear();
            document.querySelectorAll('.card-carton.seleccionado').forEach(c => c.classList.remove('seleccionado'));
            actualizarBotonAsignar();
            
            mostrarToast('✅ Asignado a ' + nombreJugador);
        });
}

function generarLinkJugador(nombre, cartonesIds) {
    const baseUrl = window.location.origin + window.location.pathname.replace('generar.html', '');
    return baseUrl + 'jugador.html?nombre=' + encodeURIComponent(nombre) + '&cartones=' + cartonesIds.join(',') + '&sala=' + SALA_ID;
}

function copiarLinkJugador() {
    const input = document.getElementById('linkJugadorInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => mostrarToast('✅ Link copiado'));
    }
}

// ============ VISTA PREVIA ============
function verVistaPrevia(id) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;
    
    preview.innerHTML = '<p style="color:#94a3b8;">Cargando...</p>';
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
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
    const estado = datos.estado || 'disponible';
    const asignadoA = datos.asignadoA || '';
    const carton = datos.carton;
    const id = datos.id;
    
    let html = '<div style="padding:20px;">';
    html += '<h2 style="color:#1e293b; margin-bottom:5px;">Cartón #' + numero + '</h2>';
    html += '<p style="color:#64748b; font-size:0.8rem;">Estado: <strong>' + estado + '</strong></p>';
    if (asignadoA) html += '<p style="color:#10b981; font-size:0.8rem;">👤 ' + asignadoA + '</p>';
    
    html += '<table style="width:100%; border-collapse:collapse; margin:15px auto; max-width:350px;">';
    html += '<tr style="background:#ff4d4d; color:white;"><th style="padding:12px;">B</th><th style="padding:12px;">I</th><th style="padding:12px;">N</th><th style="padding:12px;">G</th><th style="padding:12px;">O</th></tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:10px; border:2px solid #e2e8f0; text-align:center; font-weight:bold;';
            if (esCentro) html += 'background:#fef3c7;';
            html += '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table>';
    
    html += '<div style="margin-top:15px; display:flex; gap:8px; justify-content:center;">';
    html += '<button onclick="copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">🔗 Link</button>';
    html += '<button onclick="cambiarEstadoCarton(\'' + id + '\')" style="background:#f59e0b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">🔄 Estado</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

// ============ FUNCIONES AUXILIARES ============
function renombrarCarton(id, nombre) {
    if (nombre && nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

function cambiarEstadoCarton(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
        const datos = snap.val();
        const estados = ['disponible', 'asignado', 'usado'];
        const actual = estados.indexOf(datos.estado || 'disponible');
        const nuevoEstado = estados[(actual + 1) % estados.length];
        
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
            .then(() => mostrarToast('🗑️ Eliminado'));
    }
}

function borrarTodo() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove()
            .then(() => {
                document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>✅ Eliminados</h2></div>';
                mostrarToast('🗑️ Todos eliminados');
            });
    }
}

function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) { alert('No hay cartones'); return; }
        const data = { version: '2.0', salaId: SALA_ID, cartones: snap.val() };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones-' + SALA_ID + '.json';
        a.click();
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
                db.ref('salas/' + SALA_ID + '/cartones').set(data.cartones)
                    .then(() => mostrarToast('✅ Importados'));
            }
        } catch (error) {
            alert('❌ Error');
        }
    };
    reader.readAsText(file);
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        if (!snap.exists()) {
            preview.innerHTML = '<h2>📋 Sin cartones</h2>';
            return;
        }
        let html = '<h2 style="color:#ff4d4d;">🔗 LINKS</h2><div style="max-height:500px; overflow-y:auto; text-align:left;">';
        const base = window.location.origin + window.location.pathname.replace('generar.html', '');
        snap.forEach(child => {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px;">';
            html += '<strong>#' + (c.numero||'?') + '</strong> ' + (c.asignadoA ? '('+c.asignadoA+')' : '');
            html += '<div style="display:flex; gap:5px; margin-top:5px;"><input value="' + link + '" readonly style="flex:1; padding:5px;" onclick="this.select()"></div></div>';
        });
        html += '</div>';
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todas = Array.from(cards).every(c => c.classList.contains('seleccionado'));
    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        if (todas) {
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
    const f = texto.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(card => {
        const nombre = (card.querySelector('.input-nombre-carton')?.value || '').toLowerCase();
        card.style.display = nombre.includes(f) ? '' : 'none';
    });
}

function mostrarToast(mensaje) {
    const t = document.querySelector('.toast');
    if (t) t.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2000);
}

// ============ SINCRONIZACIÓN ============
function iniciarSincronizacion() {
    db.ref('salas/' + SALA_ID + '/cartones').on('value', snapshot => {
        const total = snapshot.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        
        const cartones = [];
        snapshot.forEach(child => cartones.push({ key: child.key, ...child.val() }));
        cartones.sort((a, b) => (a.numero || 0) - (b.numero || 0));
        
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
            
            div.innerHTML = 
                '<div class="carton-header">' +
                    '<span class="carton-id"># ' + numero + '</span>' +
                    '<span class="carton-estado estado-' + estado + '">' + estado + '</span>' +
                '</div>' +
                (carton.asignadoA ? '<div class="carton-asignado">👤 ' + carton.asignadoA + '</div>' : '') +
                '<input type="text" class="input-nombre-carton" value="' + (carton.nombre || '') + '" ' +
                    'onchange="renombrarCarton(\'' + carton.key + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
                    '<button class="btn-accion-pequeno seleccionar' + (cartonesSeleccionados.has(carton.key) ? ' activo' : '') + '" onclick="toggleSeleccionCarton(\'' + carton.key + '\', event)">' + (cartonesSeleccionados.has(carton.key) ? '✓' : '○') + '</button>' +
                    '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLinkCarton(\'' + carton.key + '\')">🔗</button>' +
                    '<button class="btn-accion-pequeno estado-btn" onclick="event.stopPropagation(); cambiarEstadoCarton(\'' + carton.key + '\')">🔄</button>' +
                    '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + carton.key + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
    });
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Bingo Admin v2.1');
    console.log('📁 Sala: ' + SALA_ID);
    
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', () => document.getElementById('fileIn').click());
    document.getElementById('btnPDF').addEventListener('click', () => alert('PDF en desarrollo'));
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnSelTodos').addEventListener('click', seleccionarTodos);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', () => window.location.href = 'ruleta.html');
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', e => filtrarCartones(e.target.value));
    document.getElementById('cantidadGenerar').addEventListener('keypress', e => { if (e.key === 'Enter') generarLote(); });
    
    iniciarSincronizacion();
});
