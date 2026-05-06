// ruleta.js - Panel de Control del Bingo

// ============ CONFIGURACIÓN ============
var db = firebase.database();

// Variables de juego
window.cantados = JSON.parse(localStorage.getItem('bingo_cantados')) || [];
window.patronBingo = Array(25).fill(false);
window.jugadoresActivos = [];
window.ultimaBola = null;

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
        
        if (window.cantados.includes(i)) {
            div.classList.add('cantada');
        }
        
        grid.appendChild(div);
    }
    
    // Actualizar indicadores
    actualizarUltimaBola();
    actualizarUltimosCantados();
}

// ============ ACTUALIZAR INDICADOR DE ÚLTIMA BOLA ============
function actualizarUltimaBola() {
    const contenedor = document.getElementById('ultimaBola');
    if (!contenedor) return;
    
    if (window.cantados.length > 0) {
        const ultimoNumero = window.cantados[window.cantados.length - 1];
        const letra = obtenerLetra(ultimoNumero);
        contenedor.querySelector('.letra').textContent = letra;
        contenedor.querySelector('.numero').textContent = ultimoNumero;
    } else {
        contenedor.querySelector('.letra').textContent = '-';
        contenedor.querySelector('.numero').textContent = '--';
    }
}

// ============ ACTUALIZAR ÚLTIMOS 5 CANTADOS ============
function actualizarUltimosCantados() {
    const contenedor = document.getElementById('ultimosCantados');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    // Obtener últimos 5 (en orden inverso: el más reciente primero)
    const ultimos = window.cantados.slice(-5).reverse();
    
    for (let i = 0; i < 5; i++) {
        const div = document.createElement('div');
        
        if (i < ultimos.length) {
            const num = ultimos[i];
            const letra = obtenerLetra(num);
            div.className = 'ultimo-item';
            div.innerHTML = '<div class="letra-peq">' + letra + '</div><div class="num-peq">' + num + '</div>';
        } else {
            div.className = 'ultimo-item vacio';
            div.innerHTML = '<div class="letra-peq">-</div><div class="num-peq">--</div>';
        }
        
        contenedor.appendChild(div);
    }
}

// ============ OBTENER LETRA SEGÚN NÚMERO ============
function obtenerLetra(numero) {
    if (numero <= 15) return 'B';
    if (numero <= 30) return 'I';
    if (numero <= 45) return 'N';
    if (numero <= 60) return 'G';
    return 'O';
}

// ============ ETAPA 1: SELECCIÓN DE JUGADORES ============
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones');
    const lista = document.getElementById('listaCheckCartones');
    
    if (!modal || !lista) return;
    
    modal.classList.add('activo');
    lista.innerHTML = "<p style='color:var(--gold); grid-column:1/-1; text-align:center;'>Cargando cartones...</p>";

    // Leer de la misma sala que generar.html
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    
    db.ref('salas/' + salaId + '/cartones').once('value', function(snapshot) {
        lista.innerHTML = '';
        
        if (!snapshot.exists()) {
            lista.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>No hay cartones generados en esta sala.</p>";
            return;
        }
        
        snapshot.forEach(function(child) {
            const c = child.val();
            if (c.estado === 'asignado' || c.estado === 'disponible') {
                const item = document.createElement('div');
                item.style.cssText = 'background:#334155; padding:10px; border-radius:6px; cursor:pointer; transition:all 0.2s;';
                item.onclick = function() {
                    const cb = item.querySelector('input');
                    cb.checked = !cb.checked;
                    item.style.background = cb.checked ? '#10b981' : '#334155';
                };
                
                item.innerHTML = `
                    <input type="checkbox" id="chk-${c.id}" value="${c.id}" style="display:none;">
                    <label for="chk-${c.id}" style="cursor:pointer; color:white; font-size:0.8rem;">
                        <b>#${c.numero || c.id}</b><br>
                        ${c.nombre || 'Cartón'}<br>
                        <span style="color:#ffca28; font-size:0.7rem;">${c.asignadoA || 'Sin asignar'}</span>
                    </label>
                `;
                lista.appendChild(item);
            }
        });
        
        if (lista.children.length === 0) {
            lista.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>Todos los cartones están usados.</p>";
        }
    });
};

window.confirmarJugadores = function() {
    const seleccionados = document.querySelectorAll('#listaCheckCartones input:checked');
    window.jugadoresActivos = Array.from(seleccionados).map(function(cb) { return cb.value; });

    if (window.jugadoresActivos.length === 0) {
        alert("Selecciona al menos un cartón para jugar.");
        return;
    }

    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId + '/jugadoresActivos').set(window.jugadoresActivos);
    
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
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId + '/patron').set(window.patronBingo);
    
    document.getElementById('modalPatron').classList.remove('activo');
    document.getElementById('btnEtapa2').style.opacity = '0.5';
    document.getElementById('panelJuego').style.opacity = '1';
    document.getElementById('panelJuego').style.pointerEvents = 'all';
    
    // Iniciar partida
    iniciarPartida();
};

// ============ INICIAR PARTIDA ============
function iniciarPartida() {
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId).update({
        estado: 'configurado',
        cantados: window.cantados,
        inicio: Date.now()
    });
}

// ============ ETAPA 3: SORTEO ============
const drawBtn = document.getElementById('drawBtn');
if (drawBtn) {
    drawBtn.onclick = function() {
        if (window.cantados.length >= 75) {
            alert('🎉 Todos los números han sido cantados');
            return;
        }

        let bola;
        let intentos = 0;
        do {
            bola = Math.floor(Math.random() * 75) + 1;
            intentos++;
            if (intentos > 1000) {
                alert('Error generando número');
                return;
            }
        } while (window.cantados.includes(bola));

        // Guardar
        window.cantados.push(bola);
        localStorage.setItem('bingo_cantados', JSON.stringify(window.cantados));

        // Actualizar tablero
        const celda = document.getElementById('seguimiento-' + bola);
        if (celda) {
            // Quitar clase ultima de todos
            document.querySelectorAll('.celda-seguimiento.ultima').forEach(function(c) {
                c.classList.remove('ultima');
            });
            
            celda.classList.add('cantada');
            celda.classList.add('ultima');
        }

        // Actualizar indicadores
        actualizarUltimaBola();
        actualizarUltimosCantados();

        // Guardar en Firebase
        const salaId = localStorage.getItem('salaActiva') || 'sala-default';
        const letra = obtenerLetra(bola);
        db.ref('partidas/' + salaId).update({
            ultimaBola: bola,
            ultimaLetra: letra,
            cantados: window.cantados,
            timestamp: Date.now()
        });
        
        // Efecto de sonido con Web Speech API
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(letra + ' ' + bola);
            msg.lang = 'es-ES';
            msg.rate = 0.8;
            window.speechSynthesis.speak(msg);
        }
    };
}

// ============ UTILIDADES ============
window.aplicarPredefinido = function(tipo) {
    if (tipo === 'lleno') window.patronBingo = Array(25).fill(true);
    if (tipo === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (tipo === 'equis') {
        window.patronBingo = Array(25).fill(false);
        [0, 4, 6, 8, 12, 16, 18, 20, 24].forEach(function(p) {
            window.patronBingo[p] = true;
        });
    }
    window.abrirModalPatron();
};

window.cambiarEstado = function(estado, mensaje) {
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId).update({
        estado: estado,
        mensaje: mensaje || '',
        timestamp: Date.now()
    });
    console.log('Estado cambiado a:', estado, mensaje);
};

window.programarJuego = function() {
    const minutos = parseInt(document.getElementById('minutosInicio').value) || 0;
    if (minutos > 0) {
        if (window.temporizador) clearTimeout(window.temporizador);
        document.getElementById('cronometroBingo').textContent = minutos + ':00';
        window.temporizador = setTimeout(function() {
            window.cambiarEstado('jugando', '⏰ Tiempo cumplido');
        }, minutos * 60000);
    }
};

window.anunciarGanador = function() {
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId).update({
        estado: 'terminado',
        ganador: true,
        timestamp: Date.now()
    });
    alert('🎉 ¡BINGO VÁLIDO! ¡Tenemos ganador!');
};

window.revisarCartonManual = function() {
    const id = document.getElementById('idABuscar').value;
    if (!id) {
        alert('Ingresa un ID de cartón');
        return;
    }
    
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('salas/' + salaId + '/cartones').once('value', function(snap) {
        let encontrado = false;
        snap.forEach(function(child) {
            const c = child.val();
            if (c.numero == id || c.id == id) {
                alert('✅ Cartón #' + c.numero + ' encontrado\n👤 ' + (c.asignadoA || 'Sin asignar') + '\nEstado: ' + c.estado);
                encontrado = true;
            }
        });
        if (!encontrado) alert('❌ Cartón no encontrado');
    });
};

// ============ REINICIAR ============
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('⚠️ ¿Reiniciar todo el juego?')) {
        window.cantados = [];
        localStorage.removeItem('bingo_cantados');
        window.patronBingo = Array(25).fill(false);
        
        const salaId = localStorage.getItem('salaActiva') || 'sala-default';
        db.ref('partidas/' + salaId).remove();
        
        inicializarTablero75();
        actualizarUltimaBola();
        actualizarUltimosCantados();
        
        document.getElementById('btnEtapa1').style.opacity = '1';
        document.getElementById('btnEtapa2').disabled = true;
        document.getElementById('btnEtapa2').style.opacity = '1';
        document.getElementById('panelJuego').style.opacity = '0.4';
        document.getElementById('panelJuego').style.pointerEvents = 'none';
        document.getElementById('cronometroBingo').textContent = '00:00';
    }
});

// ============ CERRAR MODALES CON ESC ============
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('modalCartones').classList.remove('activo');
        document.getElementById('modalPatron').classList.remove('activo');
    }
});

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel de Control iniciado');
    
    inicializarTablero75();
    actualizarUltimaBola();
    actualizarUltimosCantados();
    
    // Escuchar cambios de Firebase
    const salaId = localStorage.getItem('salaActiva') || 'sala-default';
    db.ref('partidas/' + salaId).on('value', function(snap) {
        const data = snap.val();
        if (data) {
            if (data.cantados && data.cantados.length > window.cantados.length) {
                window.cantados = data.cantados;
                localStorage.setItem('bingo_cantados', JSON.stringify(window.cantados));
                inicializarTablero75();
                actualizarUltimaBola();
                actualizarUltimosCantados();
            }
            if (data.estado === 'jugando') {
                document.getElementById('cronometroBingo').textContent = '▶️';
            }
        }
    });
    
    // Atajo: Espacio para sortear
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && document.getElementById('panelJuego').style.opacity === '1') {
            e.preventDefault();
            drawBtn.click();
        }
    });
});
