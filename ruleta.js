// ruleta.js - Panel de Control Completo Final

var db = firebase.database();
const SALA_ID = localStorage.getItem('salaActiva') || 'sala-default';

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
window.etapaActual = localStorage.getItem('bingo_etapa_' + SALA_ID) ? parseInt(localStorage.getItem('bingo_etapa_' + SALA_ID)) : 1;
window.modoJuegoSeleccionado = null;
window.ganadoresPartida = parseInt(sessionStorage.getItem('ganadores_' + SALA_ID) || '0');
window.enPausa = false;
window.pausaTimeout = null;

// ============ AUDIO BINGO ============
function reproducirAudioBingo(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance('¡Alerta! Posible Bingo de ' + nombreJugador);
        msg.lang = 'es-ES'; msg.rate = 0.85; msg.pitch = 1.0; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 2; i++) {
            setTimeout(function() {
                const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.frequency.value = 600; osc.type = 'square'; gain.gain.value = 0.2;
                osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc.stop(audioCtx.currentTime + 0.3);
            }, i * 500);
        }
    } catch(e) {}
}

function reproducirAudioBingoManual(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance('¡Bingo! ¡Bingo! ' + nombreJugador + ' cantó Bingo');
        msg.lang = 'es-ES'; msg.rate = 0.9; msg.pitch = 1.3; msg.volume = 1;
        window.speechSynthesis.speak(msg);
        setTimeout(function() {
            const msg2 = new SpeechSynthesisUtterance('¡Atención! ' + nombreJugador + ' presionó el botón de Bingo');
            msg2.lang = 'es-ES'; msg2.rate = 0.8; msg2.pitch = 1.1; msg2.volume = 1;
            window.speechSynthesis.speak(msg2);
        }, 2000);
    }
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 5; i++) {
            setTimeout(function() {
                const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.frequency.value = 800 + i * 100; osc.type = 'square'; gain.gain.value = 0.3;
                osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                osc.stop(audioCtx.currentTime + 0.4);
            }, i * 300);
        }
    } catch(e) {}
}

function reproducirAudioGanador(nombreJugador) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance('¡Tenemos un ganador! ¡' + nombreJugador + ' ha ganado el Bingo!');
        msg.lang = 'es-ES'; msg.rate = 0.9; msg.pitch = 1.1; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784, 1047].forEach(function(freq, i) {
            setTimeout(function() {
                const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.frequency.value = freq; osc.type = 'sine'; gain.gain.value = 0.3;
                osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc.stop(audioCtx.currentTime + 0.3);
            }, i * 200);
        });
    } catch(e) {}
}

// ============ INICIALIZAR TABLERO ============
function inicializarTablero75() {
    const grid = document.getElementById('historyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'celda-seguimiento'; div.id = 'seguimiento-' + i; div.textContent = i;
        if (window.cantados.includes(i)) div.classList.add('cantada');
        grid.appendChild(div);
    }
    actualizarUltimaBola(); actualizarUltimosCantados();
}

function actualizarUltimaBola() {
    const c = document.getElementById('ultimaBola'); if (!c) return;
    if (window.cantados.length > 0) { const u = window.cantados[window.cantados.length - 1]; c.querySelector('.letra').textContent = obtenerLetra(u); c.querySelector('.numero').textContent = u; }
    else { c.querySelector('.letra').textContent = '-'; c.querySelector('.numero').textContent = '--'; }
}

function actualizarUltimosCantados() {
    const c = document.getElementById('ultimosCantados'); if (!c) return; c.innerHTML = '';
    const u = window.cantados.slice(-5).reverse();
    for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = i < u.length ? 'ultimo-item' : 'ultimo-item vacio'; d.innerHTML = i < u.length ? '<div class="letra-peq">' + obtenerLetra(u[i]) + '</div><div class="num-peq">' + u[i] + '</div>' : '<div class="letra-peq">-</div><div class="num-peq">--</div>'; c.appendChild(d); }
}

function obtenerLetra(n) { if (n <= 15) return 'B'; if (n <= 30) return 'I'; if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O'; }
function guardarEstado() {
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify(window.cantados));
    localStorage.setItem('bingo_patron_' + SALA_ID, JSON.stringify(window.patronBingo));
    localStorage.setItem('bingo_jugadores_' + SALA_ID, JSON.stringify(window.jugadoresActivos));
    localStorage.setItem('bingo_activo_' + SALA_ID, window.juegoActivo.toString());
    localStorage.setItem('bingo_etapa_' + SALA_ID, window.etapaActual.toString());
}

function actualizarOnlineCount() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let count = 0; snap.forEach(function(child) { const c = child.val(); if (c.estado === 'asignado' && window.jugadoresActivos.includes(c.asignadoA)) count++; });
        const el = document.getElementById('onlineCount'); if (el) el.innerHTML = '👥 JUGADORES EN RONDA: ' + count + ' | 🏆 Ganadores: ' + window.ganadoresPartida + '/2';
    });
}

// ============ ETAPAS ============
function actualizarEtapas() {
    const btn1 = document.getElementById('btnEtapa1'), btn2 = document.getElementById('btnEtapa2');
    const btnAuto = document.getElementById('btnAutoBingo'), btnManual = document.getElementById('drawBtn');
    const btnProg = document.getElementById('btnProgramar'), panel = document.getElementById('panelJuego');
    const btnMsj = document.getElementById('btnMensaje');
    
    if (window.etapaActual === 1) {
        if (btn1) btn1.style.opacity = '1'; if (btn2) { btn2.disabled = true; btn2.style.opacity = '0.4'; }
        if (btnAuto) { btnAuto.disabled = true; btnAuto.style.opacity = '0.4'; }
        if (btnManual) { btnManual.style.opacity = '0.4'; btnManual.style.pointerEvents = 'none'; }
        if (btnProg) btnProg.disabled = true; if (panel) { panel.style.opacity = '0.4'; panel.style.pointerEvents = 'none'; }
        if (btnMsj) btnMsj.disabled = true;
    } else if (window.etapaActual === 2) {
        if (btn1) btn1.style.opacity = '0.5'; if (btn2) { btn2.disabled = false; btn2.style.opacity = '1'; }
        if (btnAuto) { btnAuto.disabled = true; btnAuto.style.opacity = '0.4'; }
        if (btnManual) { btnManual.style.opacity = '0.4'; btnManual.style.pointerEvents = 'none'; }
        if (btnProg) btnProg.disabled = true; if (panel) { panel.style.opacity = '0.4'; panel.style.pointerEvents = 'none'; }
        if (btnMsj) btnMsj.disabled = true;
    } else if (window.etapaActual === 3) {
        if (btn1) btn1.style.opacity = '0.5'; if (btn2) { btn2.style.opacity = '0.5'; btn2.disabled = true; }
        if (btnAuto) { btnAuto.disabled = window.enPausa; btnAuto.style.opacity = window.enPausa ? '0.4' : '1'; }
        if (btnManual) { btnManual.style.opacity = window.enPausa ? '0.4' : '1'; btnManual.style.pointerEvents = window.enPausa ? 'none' : 'all'; }
        if (btnProg) btnProg.disabled = window.enPausa;
        if (panel) { panel.style.opacity = window.enPausa ? '0.4' : '1'; panel.style.pointerEvents = window.enPausa ? 'none' : 'all'; }
        if (btnMsj) btnMsj.disabled = false;
    }
}
function abrirModal(id) { const m = document.getElementById(id); if (m) m.classList.add('activo'); }
function cerrarModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('activo'); }

// ============ ETAPA 1: JUGADORES ============
window.abrirModalCartones = function() {
    const modal = document.getElementById('modalCartones'), lista = document.getElementById('listaCheckCartones');
    if (!modal || !lista) return;
    abrirModal('modalCartones'); lista.innerHTML = "<p style='color:var(--gold);text-align:center;'>Cargando...</p>";
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        lista.innerHTML = ''; if (!snap.exists()) { lista.innerHTML = "<p style='color:white;text-align:center;'>No hay cartones</p>"; return; }
        const jugadoresUnicos = new Set();
        snap.forEach(function(child) {
            const c = child.val(); if (c.asignadoA && !jugadoresUnicos.has(c.asignadoA)) {
                jugadoresUnicos.add(c.asignadoA);
                const item = document.createElement('div'); item.className = 'item-jugador'; item.setAttribute('data-jugador', c.asignadoA.toLowerCase());
                if (window.jugadoresActivos.includes(c.asignadoA)) item.classList.add('seleccionado');
                item.onclick = function() {
                    if (window.jugadoresActivos.includes(c.asignadoA)) { window.jugadoresActivos = window.jugadoresActivos.filter(j => j !== c.asignadoA); item.classList.remove('seleccionado'); }
                    else { window.jugadoresActivos.push(c.asignadoA); item.classList.add('seleccionado'); } guardarEstado();
                };
                let count = 0; snap.forEach(function(ch) { if (ch.val().asignadoA === c.asignadoA) count++; });
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + c.asignadoA + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
                lista.appendChild(item);
            }
        });
        if (jugadoresUnicos.size === 0) lista.innerHTML = "<p style='color:white;text-align:center;'>No hay jugadores</p>";
    });
};
window.buscarJugadorModal = function(t) { document.querySelectorAll('.item-jugador').forEach(function(i) { const j = i.getAttribute('data-jugador'); i.style.display = (j && j.includes(t.toLowerCase())) ? '' : 'none'; }); };
window.seleccionarTodosJugadores = function() {
    const items = document.querySelectorAll('.item-jugador');
    if (Array.from(items).every(i => i.classList.contains('seleccionado'))) { window.jugadoresActivos = []; items.forEach(i => i.classList.remove('seleccionado')); }
    else { const nombres = new Set(); db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { snap.forEach(function(c) { if (c.val().asignadoA) nombres.add(c.val().asignadoA); }); window.jugadoresActivos = Array.from(nombres); items.forEach(i => i.classList.add('seleccionado')); guardarEstado(); }); }
};
window.confirmarJugadores = function() {
    if (window.jugadoresActivos.length === 0) { alert('Selecciona al menos un jugador'); return; }
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos);
    window.etapaActual = 2; guardarEstado(); actualizarEtapas(); actualizarOnlineCount(); cerrarModal('modalCartones');
};

// ============ ETAPA 2: PATRÓN ============
window.abrirModalPatron = function() {
    const modal = document.getElementById('modalPatron'), grid = document.getElementById('gridDibujoPatron');
    if (!modal || !grid) return;
    abrirModal('modalPatron'); grid.innerHTML = '';
    window.patronBingo.forEach(function(a, i) { const celda = document.createElement('div'); celda.className = 'celda-patron' + (a ? ' activa' : ''); if (i === 12) celda.innerHTML = '⭐'; celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); }; grid.appendChild(celda); });
};
window.confirmarPatron = function() { db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo); window.etapaActual = 3; window.juegoActivo = true; guardarEstado(); actualizarEtapas(); cerrarModal('modalPatron'); };
window.aplicarPredefinido = function(t) { if (t === 'lleno') window.patronBingo = Array(25).fill(true); if (t === 'limpiar') window.patronBingo = Array(25).fill(false); if (t === 'equis') { window.patronBingo = Array(25).fill(false); [0,4,6,8,12,16,18,20,24].forEach(p => window.patronBingo[p] = true); } guardarEstado(); window.abrirModalPatron(); };

// ============ TEMPORIZADOR ============
window.programarJuego = function() {
    const min = parseInt(document.getElementById('minutosInicio').value) || 0;
    if (min <= 0) { alert('Ingresa los minutos'); return; }
    const modo = confirm('⏰ Cronómetro de ' + min + ' min.\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual';
    if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
    const btnProg = document.getElementById('btnProgramar'); if (btnProg) { btnProg.textContent = '⏳ ESPERANDO... (' + (modo ? 'AUTO' : 'MANUAL') + ')'; btnProg.disabled = true; }
    let tiempo = min * 60; const cron = document.getElementById('cronometroBingo'); if (cron) cron.textContent = min + ':00';
    db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo, estado: 'iniciando', alertaInicio: 'inicio_' + Date.now(), mensajeAdmin: '⏰ Juego en ' + min + ' min. Modo: ' + (modo ? 'AUTO' : 'MANUAL'), timestamp: Date.now() });
    window.intervaloTemporizador = setInterval(function() {
        tiempo--; const mins = Math.floor(tiempo / 60), segs = tiempo % 60; if (cron) cron.textContent = String(mins).padStart(2,'0') + ':' + String(segs).padStart(2,'0');
        db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo });
        if (tiempo <= 0) { clearInterval(window.intervaloTemporizador); window.intervaloTemporizador = null; if (cron) cron.textContent = '00:00'; if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
            db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cronometro: 0, mensajeAdmin: '▶️ ¡Juego iniciado! Modo: ' + (window.modoJuegoSeleccionado === 'automatico' ? 'AUTO' : 'MANUAL'), timestamp: Date.now() });
            if ('speechSynthesis' in window) { const msg = new SpeechSynthesisUtterance('¡Es hora de empezar el bingo!'); msg.lang = 'es-ES'; window.speechSynthesis.speak(msg); }
            if (window.modoJuegoSeleccionado === 'automatico') { window.iniciarBingoAutomatico(); alert('🤖 Modo AUTOMÁTICO activado.'); } else { alert('🎲 Modo MANUAL.'); }
        }
    }, 1000);
};

// ============ MENSAJES ============
window.enviarMensajeJugador = function() {
    const mensaje = prompt('📝 Mensaje para TODOS los jugadores:');
    if (!mensaje || !mensaje.trim()) return;
    db.ref('partidas/' + SALA_ID).update({ mensajeAdmin: mensaje.trim(), timestamp: Date.now() });
    alert('✅ Mensaje enviado.');
};

// ============ BINGO AUTOMÁTICO ============
window.iniciarBingoAutomatico = function() {
    if (window.modoAutomatico || window.enPausa) return;
    window.modoAutomatico = true; window.bingoDetectado = false;
    const btnAuto = document.getElementById('btnAutoBingo'); if (btnAuto) { btnAuto.textContent = '⏸️ DETENER'; btnAuto.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; btnAuto.onclick = window.detenerBingoAutomatico; }
    const btnManual = document.getElementById('drawBtn'); if (btnManual) { btnManual.style.opacity = '0.5'; btnManual.style.pointerEvents = 'none'; }
    function cantarAuto() { if (!window.modoAutomatico || window.enPausa) return; if (window.cantados.length >= 75) { window.detenerBingoAutomatico(); return; } let b, i = 0; do { b = Math.floor(Math.random()*75)+1; i++; } while (window.cantados.includes(b) && i < 1000); cantarBola(b); verificarTodosLosCartones(); verificarPausa(); }
    window.intervaloAutomatico = setInterval(cantarAuto, 11000); setTimeout(cantarAuto, 500);
    db.ref('partidas/' + SALA_ID).update({ modo: 'automatico' });
};
window.detenerBingoAutomatico = function() {
    window.modoAutomatico = false; if (window.intervaloAutomatico) { clearInterval(window.intervaloAutomatico); window.intervaloAutomatico = null; }
    const btnAuto = document.getElementById('btnAutoBingo'); if (btnAuto) { btnAuto.textContent = '🤖 BINGO AUTOMÁTICO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; }
    const btnManual = document.getElementById('drawBtn'); if (btnManual) { btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
    db.ref('partidas/' + SALA_ID).update({ modo: 'manual' });
};

// ============ PAUSA CADA 25 ============
function verificarPausa() {
    if (window.cantados.length > 0 && window.cantados.length % 25 === 0 && window.cantados.length < 75 && !window.enPausa) {
        window.enPausa = true;
        db.ref('partidas/' + SALA_ID).update({ estado: 'pausa', pausa: true, mensajeAdmin: '⏸️ PAUSA de 1 minuto', timestamp: Date.now() });
        if (window.modoAutomatico) window.detenerBingoAutomatico();
        actualizarEtapas();
        alert('⏸️ PAUSA de 1 minuto cada 25 números.');
        window.pausaTimeout = setTimeout(function() {
            window.enPausa = false;
            db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', pausa: false, mensajeAdmin: '▶️ Juego reanudado', timestamp: Date.now() });
            actualizarEtapas();
            alert('✅ Pausa terminada.');
        }, 60000);
    }
}

// ============ CANTAR BOLA ============
function cantarBola(bola) {
    window.cantados.push(bola); guardarEstado();
    document.querySelectorAll('.celda-seguimiento.ultima').forEach(c => c.classList.remove('ultima'));
    const celda = document.getElementById('seguimiento-' + bola); if (celda) { celda.classList.add('cantada', 'ultima'); }
    actualizarUltimaBola(); actualizarUltimosCantados();
    if (window.cartonActual) { mostrarMinicarton(window.cartonActual); verificarBingoAutomatico(window.cartonActual); }
    db.ref('partidas/' + SALA_ID).update({ ultimaBola: bola, ultimaLetra: obtenerLetra(bola), cantados: window.cantados, timestamp: Date.now() });
    if ('speechSynthesis' in window) { const msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola); msg.lang = 'es-ES'; msg.rate = 0.8; window.speechSynthesis.speak(msg); }
}

document.getElementById('drawBtn').addEventListener('click', function() {
    if (window.modoAutomatico || window.etapaActual !== 3 || window.enPausa) return;
    if (window.cantados.length >= 75) { alert('🎉 Fin'); return; }
    let b, i = 0; do { b = Math.floor(Math.random()*75)+1; i++; } while (window.cantados.includes(b) && i < 1000);
    cantarBola(b); verificarTodosLosCartones(); verificarPausa();
});

// ============ VERIFICACIONES ============
function verificarTodosLosCartones() {
    if (window.bingoDetectado) return;
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let bingo = false, ganador = null;
        snap.forEach(function(child) { const c = child.val(); if (c.estado === 'asignado' && window.jugadoresActivos.includes(c.asignadoA) && verificarBingoCarton(c) && !bingo) { bingo = true; ganador = c; } });
        if (bingo && ganador) { window.bingoDetectado = true; notificarBingo(ganador); }
    });
}
function verificarBingoCarton(c) { if (!c || !c.carton || !window.patronBingo) return false; for (let i = 0; i < 25; i++) { if (!window.patronBingo[i]) continue; const f = Math.floor(i/5), col = i%5, l = ['B','I','N','G','O'][col]; if (i !== 12 && !window.cantados.includes(c.carton[l][f])) return false; } return true; }

// ============ VERIFICAR CARTÓN MANUAL ============
window.revisarCartonManual = function() {
    const idB = document.getElementById('idABuscar').value.trim(); if (!idB) { alert('Ingresa un ID'); return; }
    const cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#94a3b8;text-align:center;">Buscando...</p>';
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let encontrado = false; snap.forEach(function(child) { const c = child.val(); if ((c.numero == idB || c.id === idB) && !encontrado) { window.cartonActual = c; mostrarMinicarton(c); verificarBingoAutomatico(c); encontrado = true; } });
        if (!encontrado && cont) cont.innerHTML = '<p style="color:#ef4444;text-align:center;">❌ No encontrado</p>';
    });
};
function mostrarMinicarton(c) {
    const cont = document.getElementById('minicartonVerificador'); if (!cont || !c || !c.carton) return;
    let marcados = 0, html = '<div class="minicarton-info"><span><strong>#' + (c.numero||'?') + '</strong></span><span class="minicarton-estado" id="estadoMini">' + (c.asignadoA||'Sin asignar') + '</span></div>';
    html += '<div style="text-align:center;font-size:0.6rem;color:#64748b;">Patrón: ' + obtenerNombrePatron() + '</div><table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    for (let f=0;f<5;f++) { html+='<tr>'; ['B','I','N','G','O'].forEach(function(l){ const v=c.carton[l][f], centro=(l==='N'&&f===2); const cantado=window.cantados.includes(v); if(cantado&&!centro)marcados++; const pi=f*5+['B','I','N','G','O'].indexOf(l), ep=window.patronBingo[pi]; html+='<td class="'+(centro?'free':'')+(cantado?' marcado':'')+(ep&&!cantado&&!centro?' faltante-patron':'')+'">'+(centro?'⭐':v)+'</td>'; }); html+='</tr>'; }
    html += '</table><div style="text-align:center;font-size:0.7rem;">Marcados: '+marcados+'/24</div>'; cont.innerHTML = html;
}
function obtenerNombrePatron() { const a=window.patronBingo.filter(x=>x).length; if(a===25)return'Lleno';if(a===0)return'Sin patrón';if([0,4,6,8,12,16,18,20,24].every(p=>window.patronBingo[p])&&a===9)return'La X';return a+' celdas'; }
function verificarBingoAutomatico(c) {
    if(!c||!c.carton)return;let bingo=true,faltantes=[];
    for(let i=0;i<25;i++){if(!window.patronBingo[i])continue;const f=Math.floor(i/5),col=i%5,l=['B','I','N','G','O'][col],v=c.carton[l][f];if(i!==12&&!window.cantados.includes(v)){bingo=false;faltantes.push(l+'-'+v);}}
    const el=document.getElementById('estadoMini');if(bingo){if(el){el.className='minicarton-estado estado-bingo';el.textContent='🎉 BINGO';}const cont=document.getElementById('minicartonVerificador');if(cont)cont.style.boxShadow='0 0 20px #10b981';}else{if(el){el.className='minicarton-estado';el.textContent='Faltan: '+faltantes.slice(0,3).join(', ');el.style.background='#fef3c7';el.style.color='#92400e';}}
}

// ============ NOTIFICAR REVISIÓN ============
window.notificarRevisionJugador = function() {
    const c = window.cartonEnAlerta || window.cartonActual; const nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: true, jugador: nombre, timestamp: Date.now() });
    const cont = document.getElementById('notificacionesBingo'); if (cont) { const notif = document.createElement('div'); notif.className = 'notificacion-bingo'; notif.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; notif.innerHTML = '<div class="notif-jugador">🔍 REVISANDO</div><div class="notif-carton">👤 ' + nombre + '</div>'; cont.insertBefore(notif, cont.firstChild); }
    alert('🔍 Se notificó a ' + nombre + '.');
};
function finalizarRevision(jugador, resultado) { db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: false }); db.ref('partidas/' + SALA_ID + '/resultadoRevision').set({ jugador: jugador, resultado: resultado, timestamp: Date.now() }); }

// ============ NOTIFICACIONES ============
function notificarBingo(c) {
    const aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo');
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar'); if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?');
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; ab.style.border = '2px solid #ffca28'; document.querySelector('.alerta-titulo').textContent = '⚠️ ALERTA: Este jugador tiene BINGO'; }
    window.cartonEnAlerta = c; reproducirAudioBingo(c.asignadoA || 'Jugador');
    const cont = document.getElementById('notificacionesBingo'); if (cont) { const notif = document.createElement('div'); notif.className = 'notificacion-bingo'; notif.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; notif.innerHTML = '<div class="notif-jugador">⚠️ ALERTA SISTEMA</div><div class="notif-carton">👤 ' + (c.asignadoA||'') + ' | 🎫 #' + (c.numero||'?') + '</div>'; cont.insertBefore(notif, cont.firstChild); }
}
function notificarBingoManual(c) {
    const aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo');
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar'); if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?');
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; ab.style.border = '2px solid #ffca28'; document.querySelector('.alerta-titulo').textContent = '🚨 ¡BINGO! Jugador cantó BINGO'; }
    window.cartonEnAlerta = c; reproducirAudioBingoManual(c.asignadoA || 'Jugador');
    db.ref('partidas/' + SALA_ID).update({ bingoCantado: c.asignadoA || 'Jugador', timestamp: Date.now() });
    const cont = document.getElementById('notificacionesBingo'); if (cont) { const notif = document.createElement('div'); notif.className = 'notificacion-bingo'; notif.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; notif.style.borderLeft = '4px solid #ffca28'; notif.innerHTML = '<div class="notif-jugador">🚨 BINGO MANUAL</div><div class="notif-carton">👤 ' + (c.asignadoA||'') + ' | 🎫 #' + (c.numero||'?') + '</div>'; cont.insertBefore(notif, cont.firstChild); }
}
function escucharBingosJugadores() { db.ref('bingos/' + SALA_ID).on('child_added', function(snap) { const bingo = snap.val(); db.ref('salas/' + SALA_ID + '/cartones/' + bingo.cartonId).once('value', function(cs) { const c = cs.val(); if (c) { notificarBingoManual(c); } }); }); }

// ============ ALERTA ============
window.cerrarAlerta = function() { const ab = document.getElementById('alertaBingo'); if (ab) { ab.style.display = 'none'; ab.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; } window.cartonEnAlerta = null; };
window.bingoValido = function() {
    const c = window.cartonEnAlerta || window.cartonActual; const nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    if (window.ganadoresPartida >= 2) { alert('⚠️ Ya hay 2 ganadores.'); return; }
    if (confirm('¿BINGO VÁLIDO para ' + nombre + '?\nGanadores: ' + window.ganadoresPartida + '/2')) {
        window.ganadoresPartida++; sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString()); actualizarOnlineCount();
        finalizarRevision(nombre, 'valido'); window.cerrarAlerta(); reproducirAudioGanador(nombre);
        if (window.ganadoresPartida >= 2) {
            db.ref('partidas/' + SALA_ID).update({ estado: 'terminado', ganador: nombre, mensajeAdmin: '🎉 ¡2 GANADORES!', timestamp: Date.now() });
            if (window.modoAutomatico) window.detenerBingoAutomatico();
            setTimeout(function() { alert('🎉 ¡2 GANADORES!'); setTimeout(function() { if (confirm('🎉 ¿NUEVA PARTIDA?')) iniciarNuevaPartida(); }, 500); }, 500);
        } else {
            db.ref('partidas/' + SALA_ID).update({ mensajeAdmin: '🎉 ¡BINGO! ' + nombre + ' Ganadores: ' + window.ganadoresPartida + '/2', timestamp: Date.now() });
            window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null;
            alert('🎉 ¡BINGO VÁLIDO! ' + nombre + ' (' + window.ganadoresPartida + '/2)');
            document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
        }
    }
};
window.bingoErrado = function() {
    const c = window.cartonEnAlerta || window.cartonActual; const nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    if (confirm('¿BINGO ERRADO para ' + nombre + '?')) {
        finalizarRevision(nombre, 'errado'); db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', mensaje: 'BINGO ERRADO', timestamp: Date.now() });
        window.bingoDetectado = false; window.cerrarAlerta(); window.cartonActual = null;
        const cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
    }
};

// ============ NUEVA PARTIDA ============
function iniciarNuevaPartida() {
    window.cantados = []; window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null; window.ganadoresPartida = 0; window.enPausa = false;
    if (window.pausaTimeout) clearTimeout(window.pausaTimeout);
    if (window.modoAutomatico) window.detenerBingoAutomatico();
    sessionStorage.setItem('ganadores_' + SALA_ID, '0');
    localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify([]));
    db.ref('partidas/' + SALA_ID).set({ estado: 'nueva_partida', cantados: [], ultimaBola: null, ultimaLetra: null, mensajeAdmin: '🔄 Nueva partida', timestamp: Date.now(), patron: Array(25).fill(false), revisando: { activo: false }, resultadoRevision: null, pausa: false, cronometro: 0, alertaInicio: null, ganador: null, bingoCantado: null });
    db.ref('bingos/' + SALA_ID).remove();
    inicializarTablero75(); document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>';
    document.getElementById('notificacionesBingo').innerHTML = ''; document.getElementById('alertaBingo').style.display = 'none';
    document.getElementById('cronometroBingo').textContent = '00:00';
    const btnProg = document.getElementById('btnProgramar'); if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; }
    const btnAuto = document.getElementById('btnAutoBingo'); if (btnAuto) { btnAuto.textContent = '🤖 BINGO AUTOMÁTICO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; }
    document.getElementById('idABuscar').value = ''; actualizarEtapas(); actualizarOnlineCount();
    setTimeout(function() { db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cantados: [], timestamp: Date.now() }); alert('✅ Nueva partida lista.'); }, 2000);
}

// ============ REINICIAR ============
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('⚠️ ¿Reiniciar todo?')) { if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico); if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador); if (window.pausaTimeout) clearTimeout(window.pausaTimeout); window.cantados = []; window.patronBingo = Array(25).fill(false); window.jugadoresActivos = []; window.juegoActivo = false; window.modoAutomatico = false; window.bingoDetectado = false; window.etapaActual = 1; window.modoJuegoSeleccionado = null; window.ganadoresPartida = 0; window.enPausa = false; sessionStorage.setItem('ganadores_' + SALA_ID, '0'); ['bingo_cantados_','bingo_patron_','bingo_jugadores_','bingo_activo_','bingo_etapa_'].forEach(k => localStorage.removeItem(k + SALA_ID)); db.ref('partidas/' + SALA_ID).remove(); db.ref('bingos/' + SALA_ID).remove(); inicializarTablero75(); actualizarEtapas(); document.getElementById('minicartonVerificador').innerHTML = '<p style="color:#64748b;text-align:center;">Busca un cartón para verificar</p>'; document.getElementById('notificacionesBingo').innerHTML = ''; document.getElementById('alertaBingo').style.display = 'none'; document.getElementById('cronometroBingo').textContent = '00:00'; const bp = document.getElementById('btnProgramar'); if (bp) { bp.textContent = '⏰ PROGRAMAR'; bp.disabled = false; } const ba = document.getElementById('btnAutoBingo'); if (ba) { ba.textContent = '🤖 BINGO AUTOMÁTICO'; ba.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; ba.onclick = window.iniciarBingoAutomatico; } document.getElementById('idABuscar').value = ''; actualizarOnlineCount(); }
});

// ============ ELIMINAR JUGADORES ============
window.abrirModalEliminarJugadores = function() {
    const modal = document.getElementById('modalEliminarJugadores');
    const lista = document.getElementById('listaEliminarJugadores');
    if (!modal || !lista) return;
    abrirModal('modalEliminarJugadores'); lista.innerHTML = '';
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const jugadoresUnicos = new Set();
        snap.forEach(function(child) { const c = child.val(); if (c.asignadoA) jugadoresUnicos.add(c.asignadoA); });
        if (jugadoresUnicos.size === 0) { lista.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1;">No hay jugadores</p>'; return; }
        jugadoresUnicos.forEach(function(jugador) {
            const item = document.createElement('div'); item.className = 'item-jugador'; item.setAttribute('data-jugador', jugador.toLowerCase());
            if (window.jugadoresActivos.includes(jugador)) item.classList.add('seleccionado');
            item.onclick = function() { item.classList.toggle('seleccionado'); };
            let count = 0; snap.forEach(function(ch) { if (ch.val().asignadoA === jugador) count++; });
            item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + jugador + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
            lista.appendChild(item);
        });
    });
};
window.buscarEnModalEliminar = function(t) { document.querySelectorAll('#listaEliminarJugadores .item-jugador').forEach(function(i) { const j = i.getAttribute('data-jugador'); i.style.display = (j && j.includes(t.toLowerCase())) ? '' : 'none'; }); };
window.seleccionarTodosEnEliminar = function() {
    const items = document.querySelectorAll('#listaEliminarJugadores .item-jugador');
    const todos = Array.from(items).every(i => i.classList.contains('seleccionado'));
    items.forEach(function(item) { if (todos) item.classList.remove('seleccionado'); else item.classList.add('seleccionado'); });
};
window.confirmarEliminarJugadores = function() {
    const seleccionados = document.querySelectorAll('#listaEliminarJugadores .item-jugador.seleccionado');
    if (seleccionados.length === 0) { alert('Selecciona al menos un jugador.'); return; }
    const nombres = Array.from(seleccionados).map(function(item) { return item.getAttribute('data-jugador'); });
    if (confirm('⚠️ ¿Eliminar ' + nombres.length + ' jugadores?\n\n' + nombres.join(', ') + '\n\nSe eliminarán sus cartones.')) {
        db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
            const updates = {}; let eliminados = 0;
            snap.forEach(function(child) { const c = child.val(); if (c.asignadoA && nombres.includes(c.asignadoA.toLowerCase())) { updates['salas/' + SALA_ID + '/cartones/' + child.key] = null; eliminados++; } });
            if (eliminados > 0) { db.ref().update(updates, function(error) { if (!error) { window.jugadoresActivos = window.jugadoresActivos.filter(function(j) { return !nombres.includes(j.toLowerCase()); }); guardarEstado(); actualizarOnlineCount(); db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos); cerrarModal('modalEliminarJugadores'); alert('✅ ' + eliminados + ' cartones eliminados.'); } }); }
        });
    }
};
window.eliminarTodosJugadoresModal = function() {
    if (confirm('⚠️⚠️ ¿ELIMINAR TODOS LOS JUGADORES Y CARTONES?\n\nEsta acción NO se puede deshacer.')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove(function() { window.jugadoresActivos = []; guardarEstado(); actualizarOnlineCount(); db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set([]); cerrarModal('modalEliminarJugadores'); alert('✅ Todos eliminados.'); });
    }
};
window.eliminarJugadoresSeleccionados = function() {
    if (window.jugadoresActivos.length === 0) { alert('No hay jugadores en la ronda.'); return; }
    if (confirm('⚠️ ¿Eliminar jugadores de la ronda?\n\n' + window.jugadoresActivos.join(', ') + '\n\nNo borra cartones.')) {
        window.jugadoresActivos = []; guardarEstado(); actualizarOnlineCount(); actualizarEtapas(); db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set([]); alert('✅ Eliminados de la ronda.');
    }
};
window.eliminarTodosJugadores = function() {
    if (confirm('⚠️⚠️ ¿ELIMINAR TODO?')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove(function() { window.jugadoresActivos = []; guardarEstado(); actualizarOnlineCount(); db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set([]); alert('✅ Todo eliminado.'); });
    }
};

// ============ TECLAS ============
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { cerrarModal('modalCartones'); cerrarModal('modalPatron'); cerrarModal('modalEliminarJugadores'); } if (e.code === 'Space' && window.etapaActual === 3 && !window.modoAutomatico && !window.enPausa) { e.preventDefault(); document.getElementById('drawBtn').click(); } });

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel iniciado - Sala:', SALA_ID);
    inicializarTablero75(); escucharBingosJugadores(); actualizarEtapas(); actualizarOnlineCount();
    if (window.juegoActivo && window.etapaActual === 3) actualizarEtapas();
    db.ref('partidas/' + SALA_ID).on('value', function(snap) { const data = snap.val(); if (data && data.cantados && data.cantados.length > window.cantados.length) { window.cantados = data.cantados; guardarEstado(); inicializarTablero75(); if (window.cartonActual) { mostrarMinicarton(window.cartonActual); verificarBingoAutomatico(window.cartonActual); } } });
});
