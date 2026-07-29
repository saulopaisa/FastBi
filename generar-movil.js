// generar-movil.js - Navegación, UI móvil y asignación en vista 2

var pestanaActual = 'generar';
var todosCartones = [];
var seleccionadosVer = [];

// ============ CAMBIAR PESTAÑA ============
function cambiarPestana(pestana) {
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('activo'); });
    document.getElementById('nav' + pestana.charAt(0).toUpperCase() + pestana.slice(1)).classList.add('activo');
    
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('activo'); });
    document.getElementById('section' + pestana.charAt(0).toUpperCase() + pestana.slice(1)).classList.add('activo');
    
    pestanaActual = pestana;
    
    if (pestana === 'ver') {
        cargarCartonesVer();
    }
}

// ============ TOAST ============
function mostrarToastMovil(mensaje, tipo) {
    var anterior = document.querySelector('.toast-notification');
    if (anterior) anterior.remove();
    
    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    if (tipo === 'error') toast.classList.add('toast-error');
    if (tipo === 'success') toast.classList.add('toast-success');
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 2500);
}
window.mostrarToastMovil = mostrarToastMovil;

// ============ CARGAR CARTONES PARA VER (VISTA 2) ============
function cargarCartonesVer() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    var grid = document.getElementById('cartonesGridVer');
    if (!grid) return;
    
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;grid-column:1/-1;padding:40px;">Cargando...</p>';
    
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        todosCartones = [];
        seleccionadosVer = [];
        if (!snap.exists()) {
            grid.innerHTML = '<p style="color:#94a3b8;text-align:center;grid-column:1/-1;padding:40px;">No hay cartones</p>';
            actualizarStats();
            actualizarBtnAsignarVer();
            return;
        }
        
        snap.forEach(function(child) {
            todosCartones.push({ key: child.key, data: child.val() });
        });
        
        todosCartones.sort(function(a, b) { return (a.data.numero || 0) - (b.data.numero || 0); });
        
        actualizarStats();
        mostrarCartonesVer(todosCartones);
    });
}

function actualizarStats() {
    var total = todosCartones.length;
    var disponibles = todosCartones.filter(function(c) { return c.data.estado === 'disponible'; }).length;
    var asignados = todosCartones.filter(function(c) { return c.data.estado === 'asignado'; }).length;
    var usados = todosCartones.filter(function(c) { return c.data.estado === 'usado'; }).length;
    
    var elTotal = document.getElementById('statTotal');
    var elDisp = document.getElementById('statDisponibles');
    var elAsig = document.getElementById('statAsignados');
    var elUsados = document.getElementById('statUsados');
    
    if (elTotal) elTotal.textContent = total;
    if (elDisp) elDisp.textContent = disponibles;
    if (elAsig) elAsig.textContent = asignados;
    if (elUsados) elUsados.textContent = usados;
}

function actualizarBtnAsignarVer() {
    var btn = document.getElementById('btnAsignarVer');
    if (btn) {
        if (seleccionadosVer.length > 0 && seleccionadosVer.length <= 4) {
            btn.disabled = false;
            btn.textContent = '👤 ASIGNAR (' + seleccionadosVer.length + ') A JUGADOR';
            btn.style.opacity = '1';
        } else if (seleccionadosVer.length > 4) {
            btn.disabled = true;
            btn.textContent = '⚠️ MÁXIMO 4 CARTONES';
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = true;
            btn.textContent = '👤 ASIGNAR SELECCIONADOS A JUGADOR';
            btn.style.opacity = '0.5';
        }
    }
}

// ============ TOGGLE SELECCIÓN EN VISTA 2 ============
function toggleSeleccionVer(id) {
    var index = seleccionadosVer.indexOf(id);
    if (index !== -1) {
        seleccionadosVer.splice(index, 1);
    } else {
        if (seleccionadosVer.length >= 4) {
            mostrarToastMovil('⚠️ Máximo 4 cartones por jugador', 'error');
            return;
        }
        seleccionadosVer.push(id);
    }
    
    var cartas = document.querySelectorAll('.carton-card-ver');
    cartas.forEach(function(carta) {
        var cid = carta.getAttribute('data-id');
        if (seleccionadosVer.indexOf(cid) !== -1) {
            carta.classList.add('seleccionado');
            carta.style.borderLeft = '4px solid #10b981';
            carta.style.background = '#f0fdf4';
        } else {
            carta.classList.remove('seleccionado');
            carta.style.borderLeft = '4px solid #3b82f6';
            carta.style.background = 'white';
        }
    });
    
    actualizarBtnAsignarVer();
}

// ============ ASIGNAR DESDE VISTA 2 ============
function asignarDesdeVistaVer() {
    if (seleccionadosVer.length === 0) {
        mostrarToastMovil('⚠️ Selecciona al menos un cartón', 'error');
        return;
    }
    
    if (seleccionadosVer.length > 4) {
        mostrarToastMovil('⚠️ Máximo 4 cartones por jugador', 'error');
        return;
    }
    
    var nombre = prompt('👤 Nombre del jugador:');
    if (!nombre || !nombre.trim()) return;
    
    var nj = nombre.trim();
    var ids = seleccionadosVer.slice();
    var completados = 0;
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    
    ids.forEach(function(id) {
        db.ref('salas/' + salaId + '/cartones/' + id).update({
            estado: 'asignado',
            asignadoA: nj
        }, function(error) {
            if (!error) {
                completados++;
                if (completados === ids.length) {
                    seleccionadosVer = [];
                    mostrarToastMovil('✅ ' + ids.length + ' cartones asignados a ' + nj, 'success');
                    cargarCartonesVer();
                }
            }
        });
    });
}

// ============ MOSTRAR CARTONES EN VISTA 2 ============
function mostrarCartonesVer(cartones) {
    var grid = document.getElementById('cartonesGridVer');
    if (!grid) return;
    
    if (cartones.length === 0) {
        grid.innerHTML = '<p style="color:#94a3b8;text-align:center;grid-column:1/-1;padding:40px;">No se encontraron cartones</p>';
        return;
    }
    
    grid.innerHTML = '';
    
    cartones.forEach(function(item) {
        var c = item.data;
        var id = item.key;
        var estaSeleccionado = seleccionadosVer.indexOf(id) !== -1;
        
        var card = document.createElement('div');
        card.className = 'carton-card-ver ' + (c.estado === 'asignado' ? 'asignado' : '') + (c.estado === 'usado' ? 'usado' : '');
        card.setAttribute('data-id', id);
        
        if (estaSeleccionado) {
            card.style.borderLeft = '4px solid #10b981';
            card.style.background = '#f0fdf4';
        }
        
        var checkHTML = '<div style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:' + (estaSeleccionado ? '#10b981' : '#e2e8f0') + ';display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:bold;cursor:pointer;z-index:5;" onclick="event.stopPropagation();toggleSeleccionVer(\'' + id + '\')">' + (estaSeleccionado ? '✓' : '') + '</div>';
        
        var tabla = '<table class="carton-card-tabla"><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
        if (c.carton) {
            for (var f = 0; f < 5; f++) {
                tabla += '<tr>';
                ['B','I','N','G','O'].forEach(function(l) {
                    var v = c.carton[l][f];
                    var centro = (l === 'N' && f === 2);
                    tabla += '<td class="' + (centro ? 'free' : '') + '">' + (centro ? '⭐' : v) + '</td>';
                });
                tabla += '</tr>';
            }
        }
        tabla += '</table>';
        
        card.innerHTML = 
            checkHTML +
            '<div class="carton-card-header" onclick="toggleSeleccionVer(\'' + id + '\')">' +
            '<span class="carton-card-numero"># ' + (c.numero || '?') + '</span>' +
            '<span class="carton-card-estado estado-' + (c.estado || 'disponible') + '">' + (c.estado || 'disponible') + '</span>' +
            '</div>' +
            (c.asignadoA ? '<div class="carton-card-jugador">👤 ' + c.asignadoA + '</div>' : '') +
            tabla;
        
        grid.appendChild(card);
    });
    
    actualizarBtnAsignarVer();
}

// ============ FILTRAR EN VISTA 2 ============
function filtrarVer(estado) {
    if (estado) {
        var filtro = document.getElementById('filtroVer');
        if (filtro) filtro.value = estado;
    }
    
    var busquedaEl = document.getElementById('buscarVer');
    var filtroEl = document.getElementById('filtroVer');
    var busqueda = busquedaEl ? busquedaEl.value.toLowerCase() : '';
    var estadoFiltro = filtroEl ? filtroEl.value : 'todos';
    
    var filtrados = todosCartones.filter(function(item) {
        var c = item.data;
        var matchBusqueda = !busqueda || 
            (c.nombre || '').toLowerCase().indexOf(busqueda) !== -1 ||
            (c.asignadoA || '').toLowerCase().indexOf(busqueda) !== -1 ||
            String(c.numero || '').indexOf(busqueda) !== -1;
        
        var matchEstado = estadoFiltro === 'todos' || c.estado === estadoFiltro;
        return matchBusqueda && matchEstado;
    });
    
    mostrarCartonesVer(filtrados);
}

// ============ EXPORTAR PDF ============
function exportarPDF() {
    if (typeof exportarPDFTodos === 'function') {
        exportarPDFTodos();
    } else {
        mostrarToastMovil('📄 Abriendo PDF...', 'success');
    }
}

// ============ MOSTRAR JUGADORES (EN VISTA 1 - usa el preview de generar.js) ============
function verJugadores() {
    // Llamar a la función original de generar.js que muestra en vista-previa-contenido
    if (typeof window.verJugadoresOriginal === 'function') {
        window.verJugadoresOriginal();
    } else {
        mostrarToastMovil('👥 Cargando jugadores...', 'success');
        // Fallback: usar la función de generar.js
        if (typeof verJugadoresGenerar === 'function') {
            verJugadoresGenerar();
        }
    }
}

// ============ MOSTRAR LINKS (EN VISTA 1 - usa el preview de generar.js) ============
function verLinks() {
    if (typeof window.verLinksOriginal === 'function') {
        window.verLinksOriginal();
    } else {
        mostrarToastMovil('🔗 Cargando links...', 'success');
        if (typeof verLinksGenerar === 'function') {
            verLinksGenerar();
        }
    }
}

// ============ ACTUALIZAR CONTADOR ============
setInterval(function() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        var total = snap.numChildren() || 0;
        var contador = document.getElementById('contadorCartones');
        if (contador) contador.textContent = '🎫 CARTONES: ' + total;
    });
}, 2000);

document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Generador móvil iniciado');
});
