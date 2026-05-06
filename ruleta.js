// ruleta.js - Panel de Control con verificador y notificaciones

var db = firebase.database();
const SALA_ID = localStorage.getItem('salaActiva') || 'sala-default';

window.cantados = JSON.parse(localStorage.getItem('bingo_cantados_' + SALA_ID)) || [];
window.patronBingo = Array(25).fill(false);
window.jugadoresActivos = [];
window.cartonActual = null;

// ============ INICIALIZAR TABLERO ============
function inicializarTablero75() {
    const grid = document.getElementById('historyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento';
        div.id = 'seguimiento-' + i;
        div.textContent = i;
        if (window.cantados.includes(i)) div.classList.add('cantada');
        grid.appendChild(div);
    }
    
    actualizarUltimaBola();
    actualizarUltimosCantados();
}

function actualizarUltimaBola() {
    const contenedor = document.getElementById('ultimaBola');
    if (!contenedor) return;
    if (window.cantados.length > 0) {
        const ultimo = window.cantados[window.cantados.length - 1];
        contenedor.querySelector('.letra').textContent = obtenerLetra(ultimo);
        contenedor.querySelector('.numero').textContent = ultimo;
    } else {
        contenedor.querySelector('.letra').textContent = '-';
        contenedor.querySelector('.numero').textContent = '--';
    }
}

function actualizarUltimosCantados() {
    const contenedor = document.getElementById('ultimosCantados');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const ultimos = window.cantados.slice(-5).reverse();
    for (let i = 0; i < 5; i++) {
        const div = document.createElement('div');
        if (i < ultimos.length) {
            div.className = 'ultimo-item';
            div.innerHTML = '<div class="letra-peq">' + obtenerLetra(ultimos[i]) + '</div><div class="num-peq">' + ultimos[i] + '</div>';
        } else {
            div.className = 'ultimo-item vacio';
            div.innerHTML = '<div class="letra-peq">-</div><div class="num-peq">--</div>';
        }
        contenedor.appendChild(div);
    }
}

function obtenerLetra(numero) {
    if (numero <= 15) return 'B';
    if (numero <= 30) return 'I';
    if (numero <= 45) return 'N';
    if (numero <= 60) return 'G';
    return 'O';
}

// ============ VERIFICAR CARTÓN Y MOSTRAR MINICARTÓN ============
window.revisarCartonManual = function() {
    const idBuscado = document.getElementById('idABuscar').value.trim();
    if (!idBuscado) { alert('Ingresa un ID o número de cartón'); return; }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let encontrado = false;
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.numero == idBuscado || c.id == idBuscado || c.id.includes(idBuscado)) {
                window.cartonActual = c;
                mostrarMinicarton(c);
                verificarBingoAutomatico(c);
                encontrado = true;
            }
        });
        
        if (!encontrado) {
            alert('❌ Cartón no encontrado: ' + idBuscado);
            document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#ef4444;text-align:center;">Cartón no encontrado</p>';
        }
    });
};

function mostrarMinicarton(c) {
    const contenedor = document.getElementById('minicartonVerificador');
    if (!contenedor || !c.carton) return;
    
    const carton = c.carton;
    let marcados = 0;
    
    let html = '<div class="minicarton-info">';
    html += '<span><strong>#' + (c.numero || '?') + '</strong> ' + (c.nombre || '') + '</span>';
    html += '<span class="minicarton-estado" id="estadoMini">' + (c.asignadoA ? '👤 ' + c.asignadoA : 'Sin asignar') + '</span>';
    html += '</div>';
    html += '<table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let f = 0; f < 5; f++) {
        html += '<tr>';
        ['B','I','N','G','O'].forEach(function(l) {
            const valor = carton[l][f];
            const centro = (l === 'N' && f === 2);
            const cantado = window.cantados.includes(valor);
            if (cantado) marcados++;
            
            html += '<td class="' + (centro ? 'free' : '') + (cantado ? ' marcado' : '') + '">';
            html += (centro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    html += '</table>';
    html += '<div style="text-align:center;margin-top:5px;font-size:0.7rem;color:#64748b;">Marcados: ' + marcados + '/24</div>';
    
    contenedor.innerHTML = html;
}

// ============ VERIFICAR BINGO AUTOMÁTICO ============
function verificarBingoAutomatico(c) {
    if (!c || !c.carton || !window.patronBingo) return;
    
    const carton = c.carton;
    
    // Verificar cada celda del patrón
    let bingoCompleto = true;
    let celdasFaltantes = [];
    
    for (let i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue; // Solo verificar celdas activas del patrón
        
        const fila = Math.floor(i / 5);
        const columna = i % 5;
        const letras = ['B','I','N','G','O'];
        const letra = letras[columna];
        const valor = carton[letra][fila];
        const esCentro = (i === 12);
        
        if (!esCentro && !window.cantados.includes(valor)) {
            bingoCompleto = false;
            celdasFaltantes.push({ letra, valor, posicion: i });
        }
    }
    
    const estadoEl = document.getElementById('estadoMini');
    
    if (bingoCompleto) {
        if (estadoEl) {
            estadoEl.className = 'minicarton-estado estado-bingo';
            estadoEl.textContent = '🎉 ¡BINGO!';
        }
        
        // Notificar al admin
        notificarBingo(c);
        
        // Efecto visual en el minicartón
        document.getElementById('minicartonVerificador').style.boxShadow = '0 0 20px #10b981';
        setTimeout(function() {
            document.getElementById('minicartonVerificador').style.boxShadow = '';
        }, 3000);
        
    } else {
        if (estadoEl) {
            estadoEl.className = 'minicarton-estado';
            estadoEl.textContent = 'Faltan: ' + celdasFaltantes.map(function(x) { return x.letra + '-' + x.valor; }).join(', ');
            estadoEl.style.background = '#fef3c7';
            estadoEl.style.color = '#92400e';
        }
    }
}

// ============ NOTIFICAR BINGO ============
function notificarBingo(c) {
    const contenedor = document.getElementById('notificacionesBingo');
    if (!contenedor) return;
    
    const notif = document.createElement('div');
    notif.className = 'notificacion-bingo';
    notif.innerHTML = 
        '<div class="notif-jugador">🚨 ¡BINGO! 👤 ' + (c.asignadoA || 'Sin asignar') + '</div>' +
        '<div class="notif-carton">🎫 Cartón #' + (c.numero || '?') + ' - ' + (c.nombre || '') + '</div>' +
        '<div class="notif-tiempo">' + new Date().toLocaleTimeString() + ' - Click para verificar</div>';
    
    notif.onclick = function() {
        document.getElementById('idABuscar').value = c.numero || c.id;
        window.revisarCartonManual();
        notif.style.opacity = '0.5';
    };
    
    contenedor.insertBefore(notif, contenedor.firstChild);
    
    // Sonido de notificación
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance('Bingo de ' + (c.asignadoA || 'jugador'));
        msg.lang = 'es-ES';
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
    
    // Auto-eliminar después de 30 segundos
    setTimeout(function() {
        if (notif.parentNode) {
            notif.style.transition = 'opacity 0.5s';
            notif.style.opacity = '0';
            setTimeout(function() { if (notif.parentNode) notif.remove(); }, 500);
        }
    }, 30000);
}

// ============ ETAPAS ============
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones');
    const lista = document.getElementById('listaCheckCartones');
    if (!modal || !lista) return;
    
    modal.classList.add('activo');
    lista.innerHTML = "<p style='color:var(--gold);grid-column:1/-1;text-align:center;'>Cargando...</p>";
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        lista.innerHTML = '';
        if (!snap.exists()) { lista.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>No hay cartones</p>"; return; }
        
        snap.forEach(function(child) {
            const c = child.val();
            const item = document.createElement('div');
            item.style.cssText = 'background:#334155;padding:10px;border-radius:6px;cursor:pointer;transition:all 0.2s;';
            item.onclick = function() {
                const cb = item.querySelector('input');
                cb.checked = !cb.checked;
                item.style.background = cb.checked ? '#10b981' : '#334155';
            };
            item.innerHTML = '<input type="checkbox" value="' + c.id + '" style="display:none;"><label style="cursor:pointer;color:white;font-size:0.8rem;"><b>#' + (c.numero||'?') + '</b><br>' + (c.nombre||'') + '<br><span style="color:#ffca28;font-size:0.7rem;">' + (c.asignadoA||'Sin asignar') + '</span></label>';
            lista.appendChild(item);
        });
    });
};

window.confirmarJugadores = function() {
    const sel = document.querySelectorAll('#listaCheckCartones input:checked');
    window.jugadoresActivos = Array.from(sel).map(function(cb) { return cb.value; });
    if (window.jugadoresActivos.length === 0) { alert('Selecciona cartones'); return; }
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos);
    document.getElementById('modalCartones').classList.remove('activo');
    document.getElementById('btnEtapa2').disabled = false;
    document.getElementById('btnEtapa1').style.opacity = '0.5';
};

window.abrirModalPatron = function() {
    const modal = document.getElementById('modalPatron');
    const grid = document.getElementById('gridDibujoPatron');
    if (!modal || !grid) return;
    modal.classList.add('activo');
    grid.innerHTML = '';
    window.patronBingo.forEach(function(activo, i) {
        const celda = document.createElement('div');
        celda.className = 'celda-patron' + (activo ? ' activa' : '');
        if (i === 12) celda.innerHTML = '⭐';
        celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo);
    document.getElementById('modalPatron').classList.remove('activo');
    document.getElementById('btnEtapa2').style.opacity = '0.5';
    document.getElementById('panelJuego').style.opacity = '1';
    document.getElementById('panelJuego').style.pointerEvents = 'all';
};

// ============ SORTEO ============
document.getElementById('drawBtn').addEventListener('click', function() {
    if (window.cantados.length >= 75) { alert('Fin del juego'); return; }
    
    let bola, intentos = 0;
    do { bola = Math.floor(Math.random() * 75) + 1; intentos++; }
    while (window.cantados.includes(bola) && intentos < 1000);
    
    window.cantados.push(bola);
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
    
    // Actualizar tablero
    document.querySelectorAll('.celda-seguimiento.ultima').forEach(function(c) { c.classList.remove('ultima'); });
    const celda = document.getElementById('seguimiento-' + bola);
    if (celda) { celda.classList.add('cantada', 'ultima'); }
    
    actualizarUltimaBola();
    actualizarUltimosCantados();
    
    // Actualizar minicartón si hay uno activo
    if (window.cartonActual) {
        mostrarMinicarton(window.cartonActual);
        verificarBingoAutomatico(window.cartonActual);
    }
    
    // Firebase
    db.ref('partidas/' + SALA_ID).update({
        ultimaBola: bola,
        ultimaLetra: obtenerLetra(bola),
        cantados: window.cantados,
        timestamp: Date.now()
    });
    
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola);
        msg.lang = 'es-ES'; msg.rate = 0.8;
        window.speechSynthesis.speak(msg);
    }
});

// ============ UTILIDADES ============
window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') { window.patronBingo = Array(25).fill(false); [0,4,6,8,12,16,18,20,24].forEach(function(p) { window.patronBingo[p] = true; }); }
    window.abrirModalPatron();
};

window.cambiarEstado = function(estado, mensaje) {
    db.ref('partidas/' + SALA_ID).update({ estado: estado, mensaje: mensaje || '', timestamp: Date.now() });
};

window.programarJuego = function() {
    const min = parseInt(document.getElementById('minutosInicio').value) || 0;
    if (min > 0) {
        document.getElementById('cronometroBingo').textContent = min + ':00';
        setTimeout(function() { window.cambiarEstado('jugando', '⏰ Tiempo'); }, min * 60000);
    }
};

window.anunciarGanador = function() {
    db.ref('partidas/' + SALA_ID).update({ estado: 'terminado', ganador: true, timestamp: Date.now() });
    alert('🎉 ¡BINGO VÁLIDO!');
};

// ============ REINICIAR ============
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('⚠️ ¿Reiniciar todo?')) {
        window.cantados = [];
        localStorage.removeItem('bingo_cantados_' + SALA_ID);
        window.patronBingo = Array(25).fill(false);
        db.ref('partidas/' + SALA_ID).remove();
        inicializarTablero75();
        document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;font-size:0.8rem;">Busca un cartón para verificar</p>';
        document.getElementById('notificacionesBingo').innerHTML = '';
        document.getElementById('btnEtapa1').style.opacity = '1';
        document.getElementById('btnEtapa2').disabled = true;
        document.getElementById('panelJuego').style.opacity = '0.4';
        document.getElementById('panelJuego').style.pointerEvents = 'none';
        document.getElementById('cronometroBingo').textContent = '00:00';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('modalCartones').classList.remove('activo');
        document.getElementById('modalPatron').classList.remove('activo');
    }
    if (e.code === 'Space' && document.getElementById('panelJuego').style.opacity === '1') {
        e.preventDefault();
        document.getElementById('drawBtn').click();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel de Control iniciado');
    inicializarTablero75();
    
    db.ref('partidas/' + SALA_ID).on('value', function(snap) {
        const data = snap.val();
        if (data && data.cantados && data.cantados.length > window.cantados.length) {
            window.cantados = data.cantados;
            localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
            inicializarTablero75();
            if (window.cartonActual) { mostrarMinicarton(window.cartonActual); verificarBingoAutomatico(window.cartonActual); }
        }
    });
});
