// generar.js - Lógica del generador (Supabase)

// NO declarar SUPABASE_URL ni supabaseClient aquí - ya están en generar.html

var cartonesGenerados = [];
var cartonesSeleccionados = [];
var MAX_GANADORES_POR_NUMERO = 3;
var filtroActual = 'todos';

// ============ GENERAR CARTÓN ============
function generarCarton() {
    var rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    var letras = ['B','I','N','G','O'];
    var carton = {B:[],I:[],N:[],G:[],O:[]};
    var usados = new Set();
    for (var col = 0; col < 5; col++) {
        var min = rangos[col][0], max = rangos[col][1];
        var nums = [];
        while (nums.length < 5) {
            var n = Math.floor(Math.random()*(max-min+1))+min;
            if (!usados.has(n)) { usados.add(n); nums.push(n); }
        }
        nums.sort(function(a,b){return a-b;});
        for (var row = 0; row < 5; row++) {
            carton[letras[col]].push((col===2 && row===2) ? 'FREE' : nums[row]);
        }
    }
    return carton;
}

// ============ GENERAR MÚLTIPLES ============
function generarCartones() {
    var cantidad = parseInt(document.getElementById('cantidadGenerar').value) || 10;
    if (cantidad < 1 || cantidad > 500) { mostrarToast('⚠️ Cantidad entre 1 y 500', 'error'); return; }
    
    var numeroInicial = cartonesGenerados.length;
    var intentos = 0, maxIntentos = cantidad * 10, generados = 0;
    
    for (var i = 0; i < cantidad && intentos < maxIntentos; i++) {
        var nuevoCarton = generarCarton();
        cartonesGenerados.push({
            id: 'carton_' + Date.now() + '_' + (numeroInicial + generados),
            numero: numeroInicial + generados + 1,
            carton: nuevoCarton,
            asignadoA: null,
            estado: 'disponible'
        });
        generados++;
    }
    
    cartonesGenerados.forEach(function(c, i) { c.numero = i + 1; });
    cartonesSeleccionados = [];
    filtrarCartones('todos');
    actualizarContadores();
    guardarEnSupabase();
    mostrarToast('✅ ' + generados + ' cartones generados', 'success');
}

// ============ MOSTRAR CARTONES ============
function mostrarCartones(filtrarTermino) {
    if (!filtrarTermino) {
        document.querySelectorAll('.info-item').forEach(function(i) { i.classList.remove('active-filter'); });
        var infoTodos = document.getElementById('infoTodos');
        if (infoTodos) infoTodos.classList.add('active-filter');
        filtroActual = 'todos';
    }
    var grid = document.getElementById('cartonesGrid');
    var cartonesAMostrar = cartonesGenerados;
    if (filtrarTermino) {
        var t = filtrarTermino.toLowerCase();
        cartonesAMostrar = cartonesGenerados.filter(function(c) {
            return String(c.numero).includes(t) || (c.asignadoA || '').toLowerCase().includes(t);
        });
    }
    if (cartonesAMostrar.length === 0) {
        grid.innerHTML = '<p class="placeholder">' + (filtrarTermino ? 'Sin resultados' : 'No hay cartones') + '</p>';
        return;
    }
    grid.innerHTML = '';
    var letras = ['B','I','N','G','O'];
    cartonesAMostrar.forEach(function(c) {
        var index = cartonesGenerados.indexOf(c);
        var card = document.createElement('div'); card.className = 'carton-card'; card.id = 'cartonCard-' + index;
        var html = '<div class="carton-header-info"><span class="carton-num">#' + c.numero + '</span>';
        html += c.asignadoA ? '<span class="carton-asignado">👤 ' + c.asignadoA + '</span>' : '<span class="carton-disponible">📋 Disponible</span>';
        html += '</div><div class="carton-bingo-header">';
        letras.forEach(function(l) { html += '<div>' + l + '</div>'; });
        html += '</div><div class="carton-bingo-grid">';
        for (var f = 0; f < 5; f++) {
            letras.forEach(function(l) {
                var v = c.carton[l][f], centro = (l==='N' && f===2);
                html += '<div class="carton-bingo-cell'+(centro?' free':'')+'">'+(centro?'⭐':v)+'</div>';
            });
        }
        html += '</div><div class="carton-acciones">';
        html += '<button class="btn btn-asignar" onclick="asignarIndividual('+index+')">👤 Asignar</button>';
        html += '<button class="btn btn-eliminar" onclick="eliminarCarton('+index+')">🗑️ Eliminar</button>';
        html += '</div>';
        card.innerHTML = html; grid.appendChild(card);
    });
}

// ============ FILTRAR ============
function filtrarCartones(filtro) {
    filtroActual = filtro;
    document.querySelectorAll('.info-item').forEach(function(i) { i.classList.remove('active-filter'); });
    if (filtro === 'todos') { var el = document.getElementById('infoTodos'); if (el) el.classList.add('active-filter'); mostrarCartones(); }
    else if (filtro === 'asignados') { var el = document.getElementById('infoAsignados'); if (el) el.classList.add('active-filter'); mostrarCartonesFiltrados('asignados'); }
    else if (filtro === 'disponibles') { var el = document.getElementById('infoDisponibles'); if (el) el.classList.add('active-filter'); mostrarCartonesFiltrados('disponibles'); }
}

function mostrarCartonesFiltrados(estado) {
    var grid = document.getElementById('cartonesGrid');
    var filtrados = estado === 'asignados' ? cartonesGenerados.filter(c => c.asignadoA) : cartonesGenerados.filter(c => !c.asignadoA);
    if (filtrados.length === 0) { grid.innerHTML = '<p class="placeholder">No hay cartones ' + estado + '</p>'; return; }
    grid.innerHTML = '';
    var letras = ['B','I','N','G','O'];
    filtrados.forEach(function(c) {
        var index = cartonesGenerados.indexOf(c);
        var card = document.createElement('div'); card.className = 'carton-card';
        var html = '<div class="carton-header-info"><span class="carton-num">#' + c.numero + '</span>';
        html += c.asignadoA ? '<span class="carton-asignado">👤 ' + c.asignadoA + '</span>' : '<span class="carton-disponible">📋 Disponible</span>';
        html += '</div><div class="carton-bingo-header">';
        letras.forEach(function(l) { html += '<div>' + l + '</div>'; });
        html += '</div><div class="carton-bingo-grid">';
        for (var f = 0; f < 5; f++) { letras.forEach(function(l) { var v = c.carton[l][f], centro = (l==='N' && f===2); html += '<div class="carton-bingo-cell'+(centro?' free':'')+'">'+(centro?'⭐':v)+'</div>'; }); }
        html += '</div><div class="carton-acciones">';
        html += '<button class="btn btn-asignar" onclick="asignarIndividual('+index+')">👤</button>';
        html += '<button class="btn btn-eliminar" onclick="eliminarCarton('+index+')">🗑️</button>';
        html += '</div>';
        card.innerHTML = html; grid.appendChild(card);
    });
}

// ============ ASIGNAR ============
function asignarIndividual(index) {
    var carton = cartonesGenerados[index];
    var nombre = prompt('Nombre para cartón #' + carton.numero + ':');
    if (!nombre) return;
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    if (yaAsignados >= 2 && carton.asignadoA !== nombre) { mostrarToast('⚠️ Máximo 2', 'error'); return; }
    carton.asignadoA = nombre; carton.estado = 'asignado';
    if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
    actualizarContadores(); guardarEnSupabase();
    mostrarToast('✅ Cartón #' + carton.numero + ' → ' + nombre, 'success');
}

function eliminarCarton(index) {
    if (!confirm('¿Eliminar cartón #' + cartonesGenerados[index].numero + '?')) return;
    cartonesGenerados.splice(index, 1);
    cartonesGenerados.forEach(function(c, i) { c.numero = i + 1; });
    if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
    actualizarContadores(); guardarEnSupabase();
}

function borrarTodosCartones() {
    if (cartonesGenerados.length === 0) { mostrarToast('⚠️ No hay cartones', 'error'); return; }
    if (!confirm('¿Borrar TODOS los ' + cartonesGenerados.length + ' cartones?')) return;
    cartonesGenerados = []; cartonesSeleccionados = [];
    mostrarCartones(); actualizarContadores(); guardarEnSupabase();
}

// ============ BUSCADOR ============
function buscarCarton() {
    var termino = document.getElementById('buscarCarton').value.trim();
    var resultadosDiv = document.getElementById('resultadosBusqueda');
    var seleccionadosInfo = document.getElementById('seleccionadosInfo');
    if (!termino) {
        resultadosDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;">Escribe para buscar</p>';
        if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
        if (cartonesSeleccionados.length === 0) seleccionadosInfo.style.display = 'none';
        return;
    }
    var t = termino.toLowerCase();
    var resultados = cartonesGenerados.filter(function(c) {
        return String(c.numero).includes(t) || (c.asignadoA || '').toLowerCase().includes(t);
    });
    mostrarCartones(termino);
    if (resultados.length === 0) { resultadosDiv.innerHTML = '<p style="color:#94a3b8;">Sin resultados</p>'; return; }
    resultados = resultados.slice(0, 30);
    resultadosDiv.innerHTML = '';
    resultados.forEach(function(c) {
        var idx = cartonesGenerados.indexOf(c);
        var estaSel = cartonesSeleccionados.indexOf(idx) !== -1;
        var div = document.createElement('div'); div.className = 'resultado-busqueda';
        var checkbox = '<input type="checkbox" ' + (estaSel ? 'checked' : '') + ' ' + (cartonesSeleccionados.length >= 2 && !estaSel ? 'disabled' : '') + ' onclick="event.stopPropagation();toggleSeleccionCarton(' + idx + ', this)">';
        div.innerHTML = '<div class="info">' + checkbox + '<strong style="color:#ffca28;">#' + c.numero + '</strong><span style="color:#94a3b8;">' + (c.asignadoA || 'Disponible') + '</span></div>';
        resultadosDiv.appendChild(div);
    });
    actualizarInfoSeleccionados();
}

function toggleSeleccionCarton(index, checkbox) {
    var pos = cartonesSeleccionados.indexOf(index);
    if (pos !== -1) { cartonesSeleccionados.splice(pos, 1); checkbox.checked = false; }
    else { if (cartonesSeleccionados.length >= 2) { mostrarToast('⚠️ Máximo 2', 'error'); checkbox.checked = false; return; } cartonesSeleccionados.push(index); checkbox.checked = true; }
    actualizarInfoSeleccionados(); buscarCarton();
}

function actualizarInfoSeleccionados() {
    var info = document.getElementById('seleccionadosInfo');
    var countEl = document.getElementById('countSeleccionados');
    if (cartonesSeleccionados.length > 0) { info.style.display = 'block'; countEl.textContent = cartonesSeleccionados.length; }
    else { info.style.display = 'none'; }
}

function asignarSeleccionados() {
    var nombre = document.getElementById('nombreAsignarSeleccionados').value.trim();
    if (!nombre) { mostrarToast('⚠️ Ingresa nombre', 'error'); return; }
    if (cartonesSeleccionados.length === 0) { mostrarToast('⚠️ Selecciona cartones', 'error'); return; }
    var yaAsignados = cartonesGenerados.filter(c => c.asignadoA === nombre).length;
    if (yaAsignados + cartonesSeleccionados.length > 2) { mostrarToast('⚠️ Máximo 2', 'error'); return; }
    cartonesSeleccionados.forEach(function(idx) {
        cartonesGenerados[idx].asignadoA = nombre;
        cartonesGenerados[idx].estado = 'asignado';
    });
    var count = cartonesSeleccionados.length;
    cartonesSeleccionados = [];
    if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
    actualizarContadores(); guardarEnSupabase();
    document.getElementById('nombreAsignarSeleccionados').value = '';
    document.getElementById('seleccionadosInfo').style.display = 'none';
    mostrarToast('✅ ' + count + ' cartones asignados', 'success');
}

// ============ JUGADORES ============
function buscarJugadores() {
    var termino = document.getElementById('buscarJugador').value.trim().toLowerCase();
    var resultadosDiv = document.getElementById('resultadosJugadores');
    if (!resultadosDiv) return;
    var jugadoresMap = {};
    cartonesGenerados.forEach(function(c) {
        if (c.asignadoA) { if (!jugadoresMap[c.asignadoA]) jugadoresMap[c.asignadoA] = []; jugadoresMap[c.asignadoA].push(c); }
    });
    var jugadores = Object.keys(jugadoresMap).sort();
    if (termino) jugadores = jugadores.filter(n => n.toLowerCase().includes(termino));
    if (jugadores.length === 0) { resultadosDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;">' + (termino ? 'Sin resultados' : 'No hay jugadores') + '</p>'; return; }
    resultadosDiv.innerHTML = '';
    jugadores.forEach(function(nombre) {
        var cartones = jugadoresMap[nombre];
        var div = document.createElement('div'); div.className = 'jugador-item';
        div.innerHTML = '<div class="jugador-info"><span>👤</span><div><strong style="color:white;">' + nombre + '</strong><div style="color:#94a3b8;font-size:0.7em;">' + cartones.length + ' cartones</div></div></div>' +
            '<div style="display:flex;gap:4px;">' +
            '<button class="btn btn-link" style="font-size:0.6em;padding:4px 6px;" onclick="copiarLinkJugador(\'' + nombre.replace(/'/g, "\\'") + '\')">🔗</button>' +
            '<button class="btn btn-asignar" style="font-size:0.6em;padding:4px 6px;" onclick="renombrarJugador(\'' + nombre.replace(/'/g, "\\'") + '\')">✏️</button>' +
            '<button class="btn btn-eliminar" style="font-size:0.6em;padding:4px 6px;" onclick="eliminarJugador(\'' + nombre.replace(/'/g, "\\'") + '\')">🗑️</button>' +
            '</div>';
        resultadosDiv.appendChild(div);
    });
}

function copiarLinkJugador(nombre) {
    var base = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    var link = base + 'jugador.html?sala=' + encodeURIComponent(SALA_ID) + '&jugador=' + encodeURIComponent(nombre);
    navigator.clipboard.writeText(link).then(function() { mostrarToast('✅ Link copiado', 'success'); });
}

function eliminarJugador(nombre) {
    var cartonesJugador = cartonesGenerados.filter(c => c.asignadoA === nombre);
    if (cartonesJugador.length === 0) return;
    if (!confirm('¿Eliminar a ' + nombre + '?')) return;
    cartonesJugador.forEach(function(c) { c.asignadoA = null; c.estado = 'disponible'; });
    if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
    actualizarContadores(); guardarEnSupabase();
}

function renombrarJugador(nombreViejo) {
    var cartonesJugador = cartonesGenerados.filter(c => c.asignadoA === nombreViejo);
    if (cartonesJugador.length === 0) return;
    var nombreNuevo = prompt('Renombrar:', nombreViejo);
    if (!nombreNuevo || nombreNuevo === nombreViejo) return;
    cartonesJugador.forEach(function(c) { c.asignadoA = nombreNuevo; });
    if (filtroActual !== 'todos') { filtrarCartones(filtroActual); } else { mostrarCartones(); }
    actualizarContadores(); guardarEnSupabase();
}

// ============ CONTADORES ============
function actualizarContadores() {
    var total = cartonesGenerados.length;
    var asignados = cartonesGenerados.filter(c => c.asignadoA).length;
    document.getElementById('totalCartones').textContent = total;
    document.getElementById('totalAsignados').textContent = asignados;
    document.getElementById('totalDisponibles').textContent = total - asignados;
    document.getElementById('configTotal').textContent = total;
    document.getElementById('configAsignados').textContent = asignados;
}

// ============ SUPABASE ============
async function guardarEnSupabase() {
    try {
        await supabaseClient.from('cartones').delete().eq('sala_id', SALA_ID);
        if (cartonesGenerados.length > 0) {
            var datos = cartonesGenerados.map(function(c) {
                return { sala_id: SALA_ID, numero: c.numero, carton: c.carton, asignado_a: c.asignadoA || null, estado: c.asignadoA ? 'asignado' : 'disponible' };
            });
            await supabaseClient.from('cartones').insert(datos);
        }
        console.log('✅ Cartones guardados');
    } catch (e) { console.error('Error:', e); }
}

async function cargarDesdeSupabase() {
    try {
        var result = await supabaseClient.from('cartones').select('*').eq('sala_id', SALA_ID).order('numero');
        if (result.data && result.data.length > 0) {
            cartonesGenerados = result.data.map(function(c) {
                return { id: String(c.id), numero: c.numero, carton: c.carton, asignadoA: c.asignado_a, estado: c.estado };
            });
            mostrarCartones(); actualizarContadores();
        }
    } catch (e) { console.error('Error:', e); }
}

// ============ EXPORTAR/IMPORTAR ============
function exportarCartonesJSON() {
    if (cartonesGenerados.length === 0) { mostrarToast('⚠️ No hay cartones', 'error'); return; }
    var data = JSON.stringify(cartonesGenerados, null, 2);
    var blob = new Blob([data], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'cartones_' + SALA_ID + '.json';
    a.click(); URL.revokeObjectURL(url);
}

function importarCartonesJSON() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var data = JSON.parse(event.target.result);
                if (Array.isArray(data) && data[0].carton) {
                    cartonesGenerados = data;
                    mostrarCartones(); actualizarContadores(); guardarEnSupabase();
                    mostrarToast('✅ Importados', 'success');
                }
            } catch (err) { mostrarToast('❌ Error', 'error'); }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============ LINKS ============
function copiarLinkVerTodo() {
    var link = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + 'ver_todo.html?sala=' + encodeURIComponent(SALA_ID);
    navigator.clipboard.writeText(link).then(function() { mostrarToast('✅ Link copiado', 'success'); });
}

function copiarLinkRuleta() {
    var link = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + 'ruleta.html?sala=' + encodeURIComponent(SALA_ID);
    navigator.clipboard.writeText(link).then(function() { mostrarToast('✅ Link copiado', 'success'); });
}

function imprimirCartones() {
    if (cartonesGenerados.length === 0) { mostrarToast('⚠️ No hay cartones', 'error'); return; }
    setTimeout(function() { window.print(); }, 500);
}

// ============ NAVEGACIÓN ============
function navegarA(vista) {
    document.querySelectorAll('.section-panel').forEach(s => s.classList.remove('activo'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activo'));
    if (vista === 'cartones') { document.getElementById('sectionCartones').classList.add('activo'); document.getElementById('navCartones').classList.add('activo'); }
    else if (vista === 'jugadores') { document.getElementById('sectionJugadores').classList.add('activo'); document.getElementById('navJugadores').classList.add('activo'); buscarJugadores(); }
    else if (vista === 'config') { document.getElementById('sectionConfig').classList.add('activo'); document.getElementById('navConfig').classList.add('activo'); actualizarContadores(); }
}

// ============ TOAST ============
function mostrarToast(mensaje, tipo) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.className = 'toast ' + (tipo || '');
    toast.offsetHeight;
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}
