// ruleta.js - Panel de Control con Mejoras

var db = firebase.database();
const SALA_ID = localStorage.getItem('salaActiva') || 'sala-default';

// Estado
window.cantados = JSON.parse(localStorage.getItem('bingo_cantados_' + SALA_ID)) || [];
window.patronBingo = JSON.parse(localStorage.getItem('bingo_patron_' + SALA_ID)) || Array(25).fill(false);
window.jugadoresActivos = JSON.parse(localStorage.getItem('bingo_jugadores_' + SALA_ID)) || [];
window.cartonActual = null;
window.cartonEnAlerta = null;
window.juegoActivo = localStorage.getItem('bingo_activo_' + SALA_ID) === 'true';
window.modoAutomatico = false;
window.intervaloAutomatico = null;
window.intervaloTemporizador = null;
window.bingoDetectado = false;
window.etapaActual = 1; // 1=seleccion, 2=patron, 3=juego

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

function guardarEstado() {
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
    localStorage.setItem('bingo_patron_' + SALA_ID, JSON.stringify(window.patronBingo));
    localStorage.setItem('bingo_jugadores_' + SALA_ID, JSON.stringify(window.jugadoresActivos));
    localStorage.setItem('bingo_activo_' + SALA_ID, window.juegoActivo.toString());
}

// ============ ACTUALIZAR CONTADOR DE JUGADORES ============
function actualizarOnlineCount() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let count = 0;
        snap.forEach(function(child) {
            const c = child.val();
            if (c.estado === 'asignado' && window.jugadoresActivos.includes(c.asignadoA)) {
                count++;
            }
        });
        document.getElementById('onlineCount').innerHTML = '👥 JUGADORES EN RONDA: ' + count;
    });
}

// ============ HABILITAR/DESHABILITAR ETAPAS ============
function actualizarEtapas() {
    const btn1 = document.getElementById('btnEtapa1');
    const btn2 = document.getElementById('btnEtapa2');
    const btnAuto = document.getElementById('btnAutoBingo');
    const btnManual = document.getElementById('drawBtn');
    const btnProgramar = document.getElementById('btnProgramar');
    const panelJuego = document.getElementById('panelJuego');
    
    // Siempre permitir verificación
    // Etapa 1: Seleccionar jugadores
    if (window.etapaActual === 1) {
        btn1.style.opacity = '1';
        btn2.disabled = true;
        btn2.style.opacity = '0.4';
        btnAuto.disabled = true;
        btnAuto.style.opacity = '0.4';
        btnManual.style.opacity = '0.4';
        btnManual.style.pointerEvents = 'none';
        btnProgramar.disabled = true;
        panelJuego.style.opacity = '0.4';
        panelJuego.style.pointerEvents = 'none';
    }
    // Etapa 2: Patrón
    else if (window.etapaActual === 2) {
        btn1.style.opacity = '0.5';
        btn2.disabled = false;
        btn2.style.opacity = '1';
        btnAuto.disabled = true;
        btnAuto.style.opacity = '0.4';
        btnManual.style.opacity = '0.4';
        btnManual.style.pointerEvents = 'none';
        btnProgramar.disabled = true;
        panelJuego.style.opacity = '0.4';
        panelJuego.style.pointerEvents = 'none';
    }
    // Etapa 3: Juego
    else if (window.etapaActual === 3) {
        btn1.style.opacity = '0.5';
        btn2.style.opacity = '0.5';
        btn2.disabled = true;
        btnAuto.disabled = false;
        btnAuto.style.opacity = '1';
        btnManual.style.opacity = '1';
        btnManual.style.pointerEvents = 'all';
        btnProgramar.disabled = false;
        panelJuego.style.opacity = '1';
        panelJuego.style.pointerEvents = 'all';
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
            lista.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:white;'>No hay cartones</p>";
            return;
        }
        
        const jugadoresUnicos = new Set();
        
        // Agrupar por jugador
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA && !jugadoresUnicos.has(c.asignadoA)) {
                jugadoresUnicos.add(c.asignadoA);
                
                const item = document.createElement('div');
                item.className = 'item-jugador';
                item.setAttribute('data-jugador', c.asignadoA.toLowerCase());
                
                const estaSeleccionado = window.jugadoresActivos.includes(c.asignadoA);
                if (estaSeleccionado) item.classList.add('seleccionado');
                
                item.onclick = function() {
                    if (window.jugadoresActivos.includes(c.asignadoA)) {
                        window.jugadoresActivos = window.jugadoresActivos.filter(function(j) { return j !== c.asignadoA; });
                        item.classList.remove('seleccionado');
                    } else {
                        window.jugadoresActivos.push(c.asignadoA);
                        item.classList.add('seleccionado');
                    }
                    guardarEstado();
                };
                
                let count = 0;
                snap.forEach(function(ch) {
                    if (ch.val().asignadoA === c.asignadoA) count++;
                });
                
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + c.asignadoA + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
                lista.appendChild(item);
            }
        });
        
        if (jugadoresUnicos.size === 0) {
            lista.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:white;'>No hay jugadores. Asigna cartones primero.</p>";
        }
    });
};

// ============ BUSCAR JUGADOR EN MODAL ============
window.buscarJugadorModal = function(texto) {
    const items = document.querySelectorAll('.item-jugador');
    const filtro = texto.toLowerCase();
    items.forEach(function(item) {
        const jugador = item.getAttribute('data-jugador');
        if (jugador && jugador.includes(filtro)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};

// ============ SELECCIONAR TODOS LOS JUGADORES ============
window.seleccionarTodosJugadores = function() {
    const items = document.querySelectorAll('.item-jugador');
    const todosSeleccionados = Array.from(items).every(function(item) {
        return item.classList.contains('seleccionado');
    });
    
    items.forEach(function(item) {
        const jugador = item.getAttribute('data-jugador');
        // Buscar el nombre original
        let nombreOriginal = '';
        db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
            snap.forEach(function(child) {
                const c = child.val();
                if (c.asignadoA && c.asignadoA.toLowerCase() === jugador && !nombreOriginal) {
                    nombreOriginal = c.asignadoA;
                }
            });
        });
        
        setTimeout(function() {
            if (todosSeleccionados) {
                window.jugadoresActivos = [];
                item.classList.remove('seleccionado');
            } else {
                item.classList.add('seleccionado');
            }
        }, 100);
    });
    
    if (todosSeleccionados) {
        window.jugadoresActivos = [];
    } else {
        // Obtener todos los nombres
        const todos = new Set();
        db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
            snap.forEach(function(child) {
                const c = child.val();
                if (c.asignadoA) todos.add(c.asignadoA);
            });
            window.jugadoresActivos = Array.from(todos);
            guardarEstado();
        });
    }
};

window.confirmarJugadores = function() {
    if (window.jugadoresActivos.length === 0) {
        alert('Selecciona al menos un jugador');
        return;
    }
    
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos);
    guardarEstado();
    
    window.etapaActual = 2;
    actualizarEtapas();
    actualizarOnlineCount();
    
    document.getElementById('modalCartones').classList.remove('activo');
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
        celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo);
    guardarEstado();
    
    window.etapaActual = 3;
    window.juegoActivo = true;
    guardarEstado();
    actualizarEtapas();
    
    document.getElementById('modalPatron').classList.remove('activo');
};

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

// ============ TEMPORIZADOR PROGRAMABLE ============
window.programarJuego = function() {
    const min = parseInt(document.getElementById('minutosInicio').value) || 0;
    if (min <= 0) {
        alert('Ingresa los minutos para el inicio');
        return;
    }
    
    if (window.intervaloTemporizador) {
        clearInterval(window.intervaloTemporizador);
    }
    
    const btnProgramar = document.getElementById('btnProgramar');
    btnProgramar.textContent = '⏳ ESPERANDO...';
    btnProgramar.disabled = true;
    
    let tiempoRestante = min * 60;
    document.getElementById('cronometroBingo').textContent = min + ':00';
    
    window.intervaloTemporizador = setInterval(function() {
        tiempoRestante--;
        
        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;
        document.getElementById('cronometroBingo').textContent = 
            String(minutos).padStart(2, '0') + ':' + String(segundos).padStart(2, '0');
        
        if (tiempoRestante <= 0) {
            clearInterval(window.intervaloTemporizador);
            window.intervaloTemporizador = null;
            document.getElementById('cronometroBingo').textContent = '00:00';
            btnProgramar.textContent = '⏰ PROGRAMAR';
            btnProgramar.disabled = false;
            
            // Alerta sonora y visual
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!');
                msg.lang = 'es-ES';
                window.speechSynthesis.speak(msg);
            }
            
            // Preguntar modo de juego
            setTimeout(function() {
                const modo = confirm('⏰ ¡TIEMPO CUMPLIDO!\n\n¿Deseas iniciar en modo AUTOMÁTICO?\n\n✅ Aceptar = Automático\n❌ Cancelar = Manual');
                if (modo) {
                    window.iniciarBingoAutomatico();
                } else {
                    alert('🎲 Modo MANUAL activado. Usa el botón SORTEAR BOLA.');
                }
            }, 1000);
            
            db.ref('partidas/' + SALA_ID).update({
                estado: 'iniciando',
                mensaje: '⏰ ¡Es hora del BINGO!',
                timestamp: Date.now()
            });
        }
    }, 1000);
};

// ============ BINGO AUTOMÁTICO ============
window.iniciarBingoAutomatico = function() {
    if (window.modoAutomatico) return;
    
    window.modoAutomatico = true;
    window.bingoDetectado = false;
    
    const btnAuto = document.getElementById('btnAutoBingo');
    btnAuto.textContent = '⏸️ DETENER AUTOMÁTICO';
    btnAuto.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    btnAuto.onclick = window.detenerBingoAutomatico;
    
    document.getElementById('drawBtn').style.opacity = '0.5';
    document.getElementById('drawBtn').style.pointerEvents = 'none';
    
    console.log('🤖 Bingo Automático INICIADO - Cada 11 segundos');
    
    function cantarAutomatico() {
        if (!window.modoAutomatico || window.bingoDetectado) {
            return;
        }
        
        if (window.cantados.length >= 75) {
            window.detenerBingoAutomatico();
            return;
        }
        
        let bola, intentos = 0;
        do {
            bola = Math.floor(Math.random() * 75) + 1;
            intentos++;
        } while (window.cantados.includes(bola) && intentos < 1000);
        
        if (intentos >= 1000) return;
        
        cantarBola(bola);
        verificarTodosLosCartones();
    }
    
    window.intervaloAutomatico = setInterval(cantarAutomatico, 11000);
    setTimeout(cantarAutomatico, 500);
    
    db.ref('partidas/' + SALA_ID).update({ modo: 'automatico' });
};

window.detenerBingoAutomatico = function() {
    window.modoAutomatico = false;
    if (window.intervaloAutomatico) {
        clearInterval(window.intervaloAutomatico);
        window.intervaloAutomatico = null;
    }
    
    const btnAuto = document.getElementById('btnAutoBingo');
    btnAuto.textContent = '🤖 BINGO AUTOMÁTICO';
    btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    btnAuto.onclick = window.iniciarBingoAutomatico;
    
    document.getElementById('drawBtn').style.opacity = '1';
    document.getElementById('drawBtn').style.pointerEvents = 'all';
    
    console.log('🤖 Bingo Automático DETENIDO');
    alert('🤖 Modo automático detenido.\nAhora puedes cantar manualmente.');
    
    db.ref('partidas/' + SALA_ID).update({ modo: 'manual' });
};

// ============ CANTAR BOLA ============
function cantarBola(bola) {
    window.cantados.push(bola);
    guardarEstado();
    
    document.querySelectorAll('.celda-seguimiento.ultima').forEach(function(c) { c.classList.remove('ultima'); });
    const celda = document.getElementById('seguimiento-' + bola);
    if (celda) {
        celda.classList.add('cantada', 'ultima');
        celda.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    actualizarUltimaBola();
    actualizarUltimosCantados();
    
    if (window.cartonActual) {
        mostrarMinicarton(window.cartonActual);
        verificarBingoAutomatico(window.cartonActual);
    }
    
    db.ref('partidas/' + SALA_ID).update({
        ultimaBola: bola,
        ultimaLetra: obtenerLetra(bola),
        cantados: window.cantados,
        timestamp: Date.now()
    });
    
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola);
        msg.lang = 'es-ES';
        msg.rate = 0.8;
        window.speechSynthesis.speak(msg);
    }
}

// ============ SORTEO MANUAL ============
document.getElementById('drawBtn').addEventListener('click', function() {
    if (window.modoAutomatico || window.etapaActual !== 3) return;
    if (window.cantados.length >= 75) { alert('🎉 Todos los números cantados'); return; }
    
    let bola, intentos = 0;
    do {
        bola = Math.floor(Math.random() * 75) + 1;
        intentos++;
    } while (window.cantados.includes(bola) && intentos < 1000);
    
    cantarBola(bola);
    verificarTodosLosCartones();
});

// ============ VERIFICAR CARTONES ============
function verificarTodosLosCartones() {
    if (window.bingoDetectado) return;
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let alguienTieneBingo = false;
        let cartonGanador = null;
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.estado === 'asignado' && window.jugadoresActivos.includes(c.asignadoA)) {
                if (verificarBingoCarton(c) && !alguienTieneBingo) {
                    alguienTieneBingo = true;
                    cartonGanador = c;
                }
            }
        });
        
        if (alguienTieneBingo && cartonGanador) {
            window.bingoDetectado = true;
            notificarBingo(cartonGanador);
            if (window.modoAutomatico) {
                window.detenerBingoAutomatico();
            }
        }
    });
}

function verificarBingoCarton(c) {
    if (!c || !c.carton || !window.patronBingo) return false;
    const carton = c.carton;
    for (let i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue;
        const fila = Math.floor(i / 5);
        const columna = i % 5;
        const letras = ['B','I','N','G','O'];
        const letra = letras[columna];
        const valor = carton[letra][fila];
        if (i !== 12 && !window.cantados.includes(valor)) return false;
    }
    return true;
}

// ============ VERIFICAR CARTÓN MANUAL ============
window.revisarCartonManual = function() {
    const idBuscado = document.getElementById('idABuscar').value.trim();
    if (!idBuscado) { alert('Ingresa un ID o número de cartón'); return; }
    
    document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#94a3b8;text-align:center;">Buscando...</p>';
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let encontrado = false;
        snap.forEach(function(child) {
            const c = child.val();
            if ((c.numero == idBuscado || c.id === idBuscado) && !encontrado) {
                window.cartonActual = c;
                mostrarMinicarton(c);
                verificarBingoAutomatico(c);
                encontrado = true;
            }
        });
        if (!encontrado) {
            document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#ef4444;text-align:center;">❌ No encontrado</p>';
            window.cartonActual = null;
        }
    });
};

function mostrarMinicarton(c) {
    const contenedor = document.getElementById('minicartonVerificador');
    if (!contenedor || !c || !c.carton) return;
    
    const carton = c.carton;
    let marcados = 0;
    
    let html = '<div class="minicarton-info">';
    html += '<span><strong>#' + (c.numero || '?') + '</strong></span>';
    html += '<span class="minicarton-estado" id="estadoMini">' + (c.asignadoA || 'Sin asignar') + '</span>';
    html += '</div>';
    html += '<div style="text-align:center;font-size:0.6rem;color:#64748b;">Patrón: ' + obtenerNombrePatron() + '</div>';
    html += '<table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let f = 0; f < 5; f++) {
        html += '<tr>';
        ['B','I','N','G','O'].forEach(function(l) {
            const valor = carton[l][f];
            const centro = (l === 'N' && f === 2);
            const cantado = window.cantados.includes(valor);
            if (cantado && !centro) marcados++;
            
            const colIndex = ['B','I','N','G','O'].indexOf(l);
            const patronIndex = f * 5 + colIndex;
            const esPatron = window.patronBingo[patronIndex];
            
            html += '<td class="' + (centro ? 'free' : '') + (cantado ? ' marcado' : '') + (esPatron && !cantado && !centro ? ' faltante-patron' : '') + '">';
            html += (centro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    html += '</table><div style="text-align:center;font-size:0.7rem;">Marcados: ' + marcados + '/24</div>';
    contenedor.innerHTML = html;
}

function obtenerNombrePatron() {
    const activas = window.patronBingo.filter(function(x) { return x; }).length;
    if (activas === 25) return 'Lleno';
    if (activas === 0) return 'Sin patrón';
    if ([0,4,6,8,12,16,18,20,24].every(function(p) { return window.patronBingo[p]; }) && activas === 9) return 'La X';
    return activas + ' celdas';
}

function verificarBingoAutomatico(c) {
    if (!c || !c.carton) return;
    const carton = c.carton;
    let bingo = true, faltantes = [];
    
    for (let i = 0; i < 25; i++) {
        if (!window.patronBingo[i]) continue;
        const f = Math.floor(i/5), col = i%5;
        const l = ['B','I','N','G','O'][col];
        const v = carton[l][f];
        if (i !== 12 && !window.cantados.includes(v)) { bingo = false; faltantes.push(l+'-'+v); }
    }
    
    const el = document.getElementById('estadoMini');
    if (bingo) {
        if (el) { el.className = 'minicarton-estado estado-bingo'; el.textContent = '🎉 BINGO'; }
        document.getElementById('minicartonVerificador').style.boxShadow = '0 0 20px #10b981';
    } else {
        if (el) { el.className = 'minicarton-estado'; el.textContent = 'Faltan: ' + faltantes.slice(0,3).join(', '); el.style.background = '#fef3c7'; el.style.color = '#92400e'; }
    }
}

// ============ NOTIFICAR BINGO ============
function notificarBingo(c) {
    document.getElementById('alertaJugador').textContent = '👤 ' + (c.asignadoA || 'Sin asignar');
    document.getElementById('alertaCarton').textContent = '🎫 Cartón #' + (c.numero || '?');
    document.getElementById('alertaBingo').style.display = 'block';
    window.cartonEnAlerta = c;
    
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance('Bingo de ' + (c.asignadoA || 'jugador'));
        msg.lang = 'es-ES'; msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
    
    const cont = document.getElementById('notificacionesBingo');
    if (cont) {
        const notif = document.createElement('div');
        notif.className = 'notificacion-bingo';
        notif.innerHTML = '<div class="notif-jugador">🚨 BINGO! 👤 ' + (c.asignadoA||'') + '</div><div class="notif-carton">🎫 #' + (c.numero||'?') + '</div><div class="notif-tiempo">' + new Date().toLocaleTimeString() + '</div>';
        notif.onclick = function() { document.getElementById('idABuscar').value = c.numero||''; window.revisarCartonManual(); };
        cont.insertBefore(notif, cont.firstChild);
        if (cont.children.length > 5) cont.lastChild.remove();
    }
}

// ============ ESCUCHAR BINGOS DE JUGADORES ============
function escucharBingosJugadores() {
    db.ref('bingos/' + SALA_ID).on('child_added', function(snap) {
        const bingo = snap.val();
        db.ref('salas/' + SALA_ID + '/cartones/' + bingo.cartonId).once('value', function(cs) {
            const c = cs.val();
            if (c) {
                notificarBingo(c);
                if (window.modoAutomatico) window.detenerBingoAutomatico();
            }
        });
    });
}

// ============ ALERTA ============
window.cerrarAlerta = function() { document.getElementById('alertaBingo').style.display = 'none'; window.cartonEnAlerta = null; };
window.bingoValido = function() {
    const c = window.cartonEnAlerta || window.cartonActual;
    if (confirm('¿BINGO VÁLIDO para ' + (c?.asignadoA||'Jugador') + '?')) {
        db.ref('partidas/' + SALA_ID).update({ estado: 'terminado', ganador: c?.asignadoA||'Jugador', timestamp: Date.now() });
        if (window.modoAutomatico) window.detenerBingoAutomatico();
        window.cerrarAlerta();
        alert('🎉 ¡GANADOR!');
    }
};
window.bingoErrado = function() {
    if (confirm('¿BINGO ERRADO? El juego continúa.')) {
        db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', mensaje: 'BINGO ERRADO', timestamp: Date.now() });
        window.bingoDetectado = false;
        window.cerrarAlerta();
        window.cartonActual = null;
        document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
    }
};

// ============ REINICIAR ============
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('⚠️ ¿Reiniciar todo?')) {
        if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico);
        if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
        
        window.cantados = [];
        window.patronBingo = Array(25).fill(false);
        window.jugadoresActivos = [];
        window.juegoActivo = false;
        window.modoAutomatico = false;
        window.bingoDetectado = false;
        window.etapaActual = 1;
        
        ['bingo_cantados_','bingo_patron_','bingo_jugadores_','bingo_activo_'].forEach(function(k) {
            localStorage.removeItem(k + SALA_ID);
        });
        
        db.ref('partidas/' + SALA_ID).remove();
        db.ref('bingos/' + SALA_ID).remove();
        
        inicializarTablero75();
        actualizarEtapas();
        document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        document.getElementById('notificacionesBingo').innerHTML = '';
        document.getElementById('alertaBingo').style.display = 'none';
        document.getElementById('cronometroBingo').textContent = '00:00';
        document.getElementById('btnProgramar').textContent = '⏰ PROGRAMAR';
        document.getElementById('btnProgramar').disabled = false;
        document.getElementById('btnAutoBingo').textContent = '🤖 BINGO AUTOMÁTICO';
        document.getElementById('btnAutoBingo').style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        document.getElementById('btnAutoBingo').onclick = window.iniciarBingoAutomatico;
        document.getElementById('idABuscar').value = '';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('modalCartones').classList.remove('activo');
        document.getElementById('modalPatron').classList.remove('activo');
    }
    if (e.code === 'Space' && window.etapaActual === 3 && !window.modoAutomatico) {
        e.preventDefault();
        document.getElementById('drawBtn').click();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel iniciado - Sala:', SALA_ID);
    inicializarTablero75();
    escucharBingosJugadores();
    actualizarEtapas();
    actualizarOnlineCount();
    
    if (window.juegoActivo && window.etapaActual === 3) {
        actualizarEtapas();
    }
    
    db.ref('partidas/' + SALA_ID).on('value', function(snap) {
        const data = snap.val();
        if (data && data.cantados && data.cantados.length > window.cantados.length) {
            window.cantados = data.cantados;
            guardarEstado();
            inicializarTablero75();
            if (window.cartonActual) { mostrarMinicarton(window.cartonActual); verificarBingoAutomatico(window.cartonActual); }
        }
    });
});
