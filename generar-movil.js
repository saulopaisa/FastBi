// generar-movil.js - Navegación y UI móvil para generar

var pestanaActual = 'generar';
var todosCartones = [];

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

// Exponer globalmente
window.mostrarToastMovil = mostrarToastMovil;

// ============ CARGAR CARTONES PARA VER ============
function cargarCartonesVer() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    var grid = document.getElementById('cartonesGridVer');
    if (!grid) return;
    
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;grid-column:1/-1;padding:40px;">Cargando...</p>';
    
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        todosCartones = [];
        if (!snap.exists()) {
            grid.innerHTML = '<p style="color:#94a3b8;text-align:center;grid-column:1/-1;padding:40px;">No hay cartones</p>';
            actualizarStats();
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
        var card = document.createElement('div');
        card.className = 'carton-card-ver ' + (c.estado === 'asignado' ? 'asignado' : '') + (c.estado === 'usado' ? 'usado' : '');
        
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
            '<div class="carton-card-header">' +
            '<span class="carton-card-numero"># ' + (c.numero || '?') + '</span>' +
            '<span class="carton-card-estado estado-' + (c.estado || 'disponible') + '">' + (c.estado || 'disponible') + '</span>' +
            '</div>' +
            (c.asignadoA ? '<div class="carton-card-jugador">👤 ' + c.asignadoA + '</div>' : '') +
            tabla;
        
        grid.appendChild(card);
    });
}

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

// ============ EXPORTAR PDF (LLAMA A generar.js) ============
function exportarPDF() {
    if (typeof exportarPDFTodos === 'function') {
        exportarPDFTodos();
    } else if (typeof abrirMenuPDF === 'function') {
        abrirMenuPDF();
    } else {
        mostrarToastMovil('📄 Función PDF en desarrollo', 'error');
    }
}

// ============ MOSTRAR JUGADORES EN VISTA PREVIA ============
function mostrarJugadoresEnPreview() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    
    // Crear un contenedor temporal si no existe vista-previa-contenido
    var preview = document.getElementById('vista-previa-contenido');
    if (!preview) {
        // Mostrar en la sección de ver
        preview = document.getElementById('sectionVer');
        if (!preview) return;
    }
    
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        var jugadores = {};
        snap.forEach(function(child) {
            var c = child.val();
            if (c.asignadoA) {
                if (!jugadores[c.asignadoA]) jugadores[c.asignadoA] = [];
                jugadores[c.asignadoA].push({ id: c.id, numero: c.numero });
            }
        });
        
        if (Object.keys(jugadores).length === 0) {
            preview.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;"><h3>👥 No hay jugadores</h3><p>Asigna cartones primero</p></div>';
            return;
        }
        
        var html = '<div style="padding:15px;"><h3 style="color:#ff4d4d;">👥 JUGADORES</h3><div style="max-height:60vh;overflow-y:auto;">';
        
        Object.keys(jugadores).forEach(function(nombre) {
            var cartones = jugadores[nombre];
            var ids = cartones.map(function(c) { return c.id; });
            var link = generarLinkCifrado(nombre, ids);
            
            html += '<div style="background:#f1f5f9;padding:10px;margin:5px 0;border-radius:8px;">';
            html += '<strong>👤 ' + nombre + '</strong> - ' + cartones.length + ' cart.';
            html += '<div style="display:flex;gap:5px;margin-top:5px;">';
            html += '<input value="' + link + '" readonly style="flex:1;padding:5px;font-size:0.7rem;" onclick="this.select()">';
            html += '<button onclick="navigator.clipboard.writeText(\'' + link + '\');mostrarToastMovil(\'✅ Copiado\',\'success\')" style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">📋</button>';
            html += '</div></div>';
        });
        
        html += '</div></div>';
        preview.innerHTML = html;
    });
}

// ============ MOSTRAR LINKS EN VISTA PREVIA ============
function mostrarLinksEnPreview() {
    var salaId = localStorage.getItem('salaActiva') || 'bingo-default';
    
    var preview = document.getElementById('vista-previa-contenido');
    if (!preview) {
        preview = document.getElementById('sectionVer');
        if (!preview) return;
    }
    
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            preview.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;"><h3>📋 Sin cartones</h3></div>';
            return;
        }
        
        var html = '<div style="padding:15px;"><h3 style="color:#ff4d4d;">🔗 LINKS</h3><div style="max-height:60vh;overflow-y:auto;text-align:left;">';
        
        snap.forEach(function(child) {
            var c = child.val();
            var link = generarLinkCifrado(c.asignadoA || 'Cartón #' + c.numero, [c.id]);
            
            html += '<div style="background:#f1f5f9;padding:8px;margin:4px 0;border-radius:6px;">';
            html += '<strong>#' + c.numero + '</strong>' + (c.asignadoA ? ' (' + c.asignadoA + ')' : '');
            html += '<input value="' + link + '" readonly style="width:100%;padding:4px;margin-top:4px;font-size:0.7rem;" onclick="this.select()">';
            html += '</div>';
        });
        
        html += '</div></div>';
        preview.innerHTML = html;
    });
}

// ============ FUNCIONES QUE SE LLAMAN DESDE LOS BOTONES ============
function verJugadores() {
    mostrarJugadoresEnPreview();
}

function verLinks() {
    mostrarLinksEnPreview();
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
