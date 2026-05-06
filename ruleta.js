// ruleta.js - Panel de Control con persistencia y verificador

var db = firebase.database();
const SALA_ID = localStorage.getItem('salaActiva') || 'sala-default';

// Cargar estado guardado
window.cantados = JSON.parse(localStorage.getItem('bingo_cantados_' + SALA_ID)) || [];
window.patronBingo = JSON.parse(localStorage.getItem('bingo_patron_' + SALA_ID)) || Array(25).fill(false);
window.jugadoresActivos = JSON.parse(localStorage.getItem('bingo_jugadores_' + SALA_ID)) || [];
window.cartonActual = null;
window.juegoActivo = localStorage.getItem('bingo_activo_' + SALA_ID) === 'true';

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

// ============ GUARDAR ESTADO ============
function guardarEstado() {
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
    localStorage.setItem('bingo_patron_' + SALA_ID, JSON.stringify(window.patronBingo));
    localStorage.setItem('bingo_jugadores_' + SALA_ID, JSON.stringify(window.jugadoresActivos));
    localStorage.setItem('bingo_activo_' + SALA_ID, window.juegoActivo.toString());
}

// ============ VERIFICAR CARTÓN ============
window.revisarCartonManual = function() {
    const idBuscado = document.getElementById('idABuscar').value.trim();
    if (!idBuscado) { alert('Ingresa un ID o número de cartón'); return; }
    
    const minicartonContainer = document.getElementById('minicartonVerificador');
    minicartonContainer.innerHTML = '<p style="color:#94a3b8;text-align:center;">Buscando...</p>';
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let encontrado = false;
        
        snap.forEach(function(child) {
            const c = child.val();
            // Buscar por número exacto o por ID
            if (c.numero == idBuscado || c.id === idBuscado) {
                window.cartonActual = c;
                mostrarMinicarton(c);
                verificarBingoAutomatico(c);
                encontrado = true;
            }
        });
        
        if (!encontrado) {
            // Buscar por coincidencia parcial en ID
            snap.forEach(function(child) {
                const c = child.val();
                if (!encontrado && c.id && c.id.includes(idBuscado)) {
                    window.cartonActual = c;
                    mostrarMinicarton(c);
                    verificarBingoAutomatico(c);
                    encontrado = true;
                }
            });
        }
        
        if (!encontrado) {
            minicartonContainer.innerHTML = '<p style="color:#ef4444;text-align:center;">❌ Cartón no encontrado: ' + idBuscado + '</p>';
            window.cartonActual = null;
        }
    });
};

function mostrarMinicarton(c) {
    const contenedor = document.getElementById('minicartonVerificador');
    if (!contenedor || !c || !c.carton) {
        contenedor.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar cartón</p>';
        return;
    }
    
    const carton = c.carton;
    let marcados = 0;
    
    let html = '<div class="minicarton-info">';
    html += '<span><strong>#' + (c.numero || '?') + '</strong> ' + (c.nombre || '') + '</span>';
    html += '<span class="minicarton-estado" id="estadoMini">' + (c.asignadoA ? '👤 ' + c.asignadoA : 'Sin asignar') + '</span>';
    html += '</div>';
    
    // Mostrar patrón activo
    html += '<div style="text-align:center;font-size:0.6rem;color:#64748b;margin-bottom:5px;">Patrón: ' + obtenerNombrePatron() + '</div>';
    
    html += '<table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let f = 0; f < 5; f++) {
        html += '<tr>';
        ['B','I','N','G','O'].forEach(function(l) {
            const valor = carton[l][f];
            const centro = (l === 'N' && f === 2);
            const cantado = window.cantados.includes(valor);
            if (cantado && !centro) marcados++;
            
            // Verificar si esta celda es parte del patrón
            const colIndex = ['B','I','N','G','O'].indexOf(l);
            const patronIndex = f * 5 + colIndex;
            const esPartePatron = window.patronBingo[patronIndex];
            
            html += '<td class="' + 
                (centro ? 'free' : '') + 
                (cantado ? ' marcado' : '') + 
                (esPartePatron && !cantado && !centro ? ' faltante-patron' : '') + 
                '" style="' + (esPartePatron && !cantado && !centro ? 'border:2px dashed #f59e0b;' : '') + '">';
            html += (centro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    html += '</table>';
    html += '<div style="text-align:center;margin-top:5px;font-size:0.7rem;color:#64748b;">Marcados: ' + marcados + '/24</div>';
    
    contenedor.innerHTML = html;
}

function obtenerNombrePatron() {
    const activas = window.patronBingo.filter(function(x) { return x; }).length;
    if (activas === 25) return 'Cartón Lleno';
    if (activas === 0) return 'Sin patrón';
    
    // Verificar si es X
    const posX = [0,4,6,8,12,16,18,20,24];
    const esX = posX.every(function(p) { return window.patronBingo[p]; }) && activas === 9;
    if (esX) return 'La X';
    
    return activas + ' celdas';
}

// ============ VERIFICAR BINGO AUTOMÁTICO ============
function verificarBingoAutomatico(c) {
    if (!c || !c.carton || !window.patronBingo) return;
    
    const carton = c.carton;
    let bingoCompleto = true;
    let celdasFaltantes = [];
    
    for (let i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue;
        
        const fila = Math.floor(i / 5);
        const columna = i % 5;
        const letras = ['B','I','N','G','O'];
        const letra = letras[columna];
        const valor = carton[letra][fila];
        const esCentro = (i === 12);
        
        if (!esCentro && !window.cantados.includes(valor)) {
            bingoCompleto = false;
            celdasFaltantes.push(letra + '-' + valor);
        }
    }
    
    const estadoEl = document.getElementById('estadoMini');
    
    if (bingoCompleto) {
        if (estadoEl) {
            estadoEl.className = 'minicarton-estado estado-bingo';
            estadoEl.textContent = '🎉 ¡BINGO!';
        }
        
        // Notificar SOLO si no se ha notificado antes
        if (!c.bingoNotificado) {
            c.bingoNotificado = true;
            notificarBingo(c);
        }
        
        document.getElementById('minicartonVerificador').style.boxShadow = '0 0 20px #10b981';
        setTimeout(function() {
            document.getElementById('minicartonVerificador').style.boxShadow = '';
        }, 3000);
        
    } else {
        if (estadoEl) {
            estadoEl.className = 'minicarton-estado';
            estadoEl.textContent = 'Faltan: ' + celdasFaltantes.join(', ');
            estadoEl.style.background = '#fef3c7';
            estadoEl.style.color = '#92400e';
            estadoEl.style.fontSize = '0.6rem';
        }
        c.bingoNotificado = false;
    }
}

// ============ NOTIFICAR BINGO (SIN SONIDO) ============
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
        document.getElementById('idABuscar').value = c.numero || '';
        window.revisarCartonManual();
        notif.style.opacity = '0.5';
    };
    
    contenedor.insertBefore(notif, contenedor.firstChild);
    
    // Limpiar notificaciones antiguas (máximo 5)
    const notificaciones = contenedor.querySelectorAll('.notificacion-bingo');
    if (notificaciones.length > 5) {
        notificaciones[notificaciones.length - 1].remove();
    }
}

// ============ ETAPA 1: SELECCIÓN DE JUGADORES ============
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones');
    const lista = document.getElementById('listaCheckCartones');
    if (!modal || !lista) return;
    
    modal.classList.add('activo');
    lista.innerHTML = "<p style='color:var(--gold);grid-column:1/-1;text-align:center;'>Cargando...</p>";
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        lista.innerHTML = '';
        if (!snap.exists()) {
            lista.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:white;'>No hay cartones en esta sala</p>";
            return;
        }
        
        const jugadoresUnicos = new Set();
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA && !jugadoresUnicos.has(c.asignadoA)) {
                jugadoresUnicos.add(c.asignadoA);
                
                const item = document.createElement('div');
                item.style.cssText = 'background:#334155;padding:12px;border-radius:8px;cursor:pointer;transition:all 0.2s;text-align:center;';
                
                const estaSeleccionado = window.jugadoresActivos.includes(c.asignadoA);
                if (estaSeleccionado) item.style.background = '#10b981';
                
                item.onclick = function() {
                    if (window.jugadoresActivos.includes(c.asignadoA)) {
                        window.jugadoresActivos = window.jugadoresActivos.filter(function(j) { return j !== c.asignadoA; });
                        item.style.background = '#334155';
                    } else {
                        window.jugadoresActivos.push(c.asignadoA);
                        item.style.background = '#10b981';
                    }
                    guardarEstado();
                };
                
                // Contar cartones de este jugador
                let count = 0;
                snap.forEach(function(ch) {
                    if (ch.val().asignadoA === c.asignadoA) count++;
                });
                
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;font-size:0.85rem;">' + c.asignadoA + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
                lista.appendChild(item);
            }
        });
        
        if (jugadoresUnicos.size === 0) {
            lista.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:white;'>No hay jugadores asignados. Asigna cartones primero.</p>";
        }
    });
};

window.confirmarJugadores = function() {
    if (window.jugadoresActivos.length === 0) {
        alert('Selecciona al menos un jugador');
        return;
    }
    
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos);
    guardarEstado();
    
    document.getElementById('modalCartones').classList.remove('activo');
    document.getElementById('btnEtapa2').disabled = false;
    document.getElementById('btnEtapa1').style.opacity = '0.5';
};

// ============ ETAPA 2: PATRÓN ============
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
        celda.onclick = function() {
            window.patronBingo[i] = !window.patronBingo[i];
            celda.classList.toggle('activa');
        };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo);
    guardarEstado();
    
    window.juegoActivo = true;
    guardarEstado();
    
    document.getElementById('modalPatron').classList.remove('activo');
    document.getElementById('btnEtapa2').style.opacity = '0.5';
    document.getElementById('panelJuego').style.opacity = '1';
    document.getElementById('panelJuego').style.pointerEvents = 'all';
};

// ============ SORTEO ============
document.getElementById('drawBtn').addEventListener('click', function() {
    if (window.cantados.length >= 75) {
        alert('🎉 Todos los números han sido cantados');
        return;
    }
    
    let bola, intentos = 0;
    do {
        bola = Math.floor(Math.random() * 75) + 1;
        intentos++;
    } while (window.cantados.includes(bola) && intentos < 1000);
    
    if (intentos >= 1000) { alert('Error generando número'); return; }
    
    window.cantados.push(bola);
    guardarEstado();
    
    // Actualizar tablero
    document.querySelectorAll('.celda-seguimiento.ultima').forEach(function(c) { c.classList.remove('ultima'); });
    const celda = document.getElementById('seguimiento-' + bola);
    if (celda) {
        celda.classList.add('cantada', 'ultima');
        celda.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
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
    
    // SONIDO SOLO AL CANTAR BOLA
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola);
        msg.lang = 'es-ES';
        msg.rate = 0.8;
        window.speechSynthesis.speak(msg);
    }
});

// ============ UTILIDADES ============
window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0,4,6,8,12,16,18,20,24].forEach(function(p) { window.patronBingo[p] = true; });
    }
    guardarEstado();
    window.abrirModalPatron();
};

window.cambiarEstado = function(estado, mensaje) {
    db.ref('partidas/' + SALA_ID).update({
        estado: estado,
        mensaje: mensaje || '',
        timestamp: Date.now()
    });
};

window.programarJuego = function() {
    const min = parseInt(document.getElementById('minutosInicio').value) || 0;
    if (min > 0) {
        document.getElementById('cronometroBingo').textContent = min + ':00';
        setTimeout(function() {
            window.cambiarEstado('jugando', '⏰ Tiempo cumplido');
        }, min * 60000);
    }
};

window.anunciarGanador = function() {
    db.ref('partidas/' + SALA_ID).update({
        estado: 'terminado',
        ganador: true,
        timestamp: Date.now()
    });
    alert('🎉 ¡BINGO VÁLIDO! ¡Tenemos ganador!');
};

// ============ REINICIAR ============
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('⚠️ ¿Reiniciar todo el juego? Se perderá el progreso.')) {
        window.cantados = [];
        window.patronBingo = Array(25).fill(false);
        window.jugadoresActivos = [];
        window.juegoActivo = false;
        window.cartonActual = null;
        
        localStorage.removeItem('bingo_cantados_' + SALA_ID);
        localStorage.removeItem('bingo_patron_' + SALA_ID);
        localStorage.removeItem('bingo_jugadores_' + SALA_ID);
        localStorage.setItem('bingo_activo_' + SALA_ID, 'false');
        
        db.ref('partidas/' + SALA_ID).remove();
        
        inicializarTablero75();
        document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        document.getElementById('notificacionesBingo').innerHTML = '';
        document.getElementById('btnEtapa1').style.opacity = '1';
        document.getElementById('btnEtapa2').disabled = true;
        document.getElementById('btnEtapa2').style.opacity = '1';
        document.getElementById('panelJuego').style.opacity = '0.4';
        document.getElementById('panelJuego').style.pointerEvents = 'none';
        document.getElementById('cronometroBingo').textContent = '00:00';
        document.getElementById('idABuscar').value = '';
    }
});

// ============ TECLAS ============
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

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel de Control iniciado - Sala:', SALA_ID);
    
    inicializarTablero75();
    
    // Restaurar estado si el juego estaba activo
    if (window.juegoActivo) {
        document.getElementById('btnEtapa1').style.opacity = '0.5';
        document.getElementById('btnEtapa2').disabled = false;
        document.getElementById('btnEtapa2').style.opacity = '0.5';
        document.getElementById('panelJuego').style.opacity = '1';
        document.getElementById('panelJuego').style.pointerEvents = 'all';
    }
    
    // Escuchar cambios de Firebase
    db.ref('partidas/' + SALA_ID).on('value', function(snap) {
        const data = snap.val();
        if (data && data.cantados && data.cantados.length > window.cantados.length) {
            window.cantados = data.cantados;
            guardarEstado();
            inicializarTablero75();
            if (window.cartonActual) {
                mostrarMinicarton(window.cartonActual);
                verificarBingoAutomatico(window.cartonActual);
            }
        }
    });
});
