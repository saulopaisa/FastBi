// ruleta.js - Panel de Control Completo (Móvil + Desktop)

var db = firebase.database();
var SALA_ID = localStorage.getItem('salaActiva') || 'bingo-default';

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
window.partidaIniciada = false;

// ============ TOAST ============
function mostrarToast(mensaje, tipo) {
    var anterior = document.querySelector('.toast-notification');
    if (anterior) anterior.remove();
    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    if (tipo === 'error') toast.classList.add('toast-error');
    if (tipo === 'success') toast.classList.add('toast-success');
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300); }, 2500);
}

// ============ SINCRONIZAR ============
function sincronizarEstadoDesdeFirebase() {
    db.ref('partidas/' + SALA_ID).once('value', function(snap) {
        var data = snap.val(); if (!data) return;
        if (data.jugadoresActivos && data.jugadoresActivos.length > 0) { window.jugadoresActivos = data.jugadoresActivos; guardarEstado(); if (window.etapaActual < 2) window.etapaActual = 2; }
        if (data.patron && data.patron.some(function(x) { return x; })) { window.patronBingo = data.patron; guardarEstado(); if (window.etapaActual < 3) window.etapaActual = 3; window.juegoActivo = true; localStorage.setItem('bingo_activo_' + SALA_ID, 'true'); }
        if (data.cantados && data.cantados.length > 0) { window.cantados = data.cantados; guardarEstado(); window.juegoActivo = true; localStorage.setItem('bingo_activo_' + SALA_ID, 'true'); if (window.etapaActual < 3) window.etapaActual = 3; }
        if (data.ganadoresCount !== undefined) { window.ganadoresPartida = data.ganadoresCount; sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString()); }
        if (data.modo === 'automatico') window.modoJuegoSeleccionado = 'automatico'; else if (data.modo === 'manual') window.modoJuegoSeleccionado = 'manual';
        if (data.pausa) window.enPausa = data.pausa;
        if (data.partidaIniciada) window.partidaIniciada = true;
        actualizarEtapas(); actualizarOnlineCount(); inicializarTablero75();
    });
}

// ============ AUDIO ============
function reproducirAudioBingo(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Alerta! Posible Bingo de ' + n); m.lang = 'es-ES'; m.rate = 0.85; window.speechSynthesis.speak(m); } }
function reproducirAudioBingoManual(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Bingo! ' + n + ' cantó Bingo'); m.lang = 'es-ES'; m.rate = 0.9; window.speechSynthesis.speak(m); } }
function reproducirAudioGanador(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Ganador! ' + n); m.lang = 'es-ES'; m.rate = 0.9; window.speechSynthesis.speak(m); } }

// ============ TABLERO ============
function inicializarTablero75() {
    var grid = document.getElementById('historyGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) { var d = document.createElement('div'); d.className = 'celda-seguimiento'; d.id = 'seguimiento-' + i; d.textContent = i; if (window.cantados.indexOf(i) !== -1) d.classList.add('cantada'); grid.appendChild(d); }
    actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas(); inicializarTableroMovil();
}

function inicializarTableroMovil() {
    var grid = document.getElementById('historyGridMobile'); if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) { var d = document.createElement('div'); d.className = 'celda-movil'; d.textContent = i; if (window.cantados.indexOf(i) !== -1) d.classList.add('cantada'); grid.appendChild(d); }
}

function limpiarTableroCompleto() {
    var gridDesktop = document.getElementById('historyGrid');
    if (gridDesktop) { var celdasD = gridDesktop.querySelectorAll('.celda-seguimiento'); celdasD.forEach(function(c) { c.classList.remove('cantada', 'ultima'); }); }
    var gridMobile = document.getElementById('historyGridMobile');
    if (gridMobile) { var celdasM = gridMobile.querySelectorAll('.celda-movil'); celdasM.forEach(function(c) { c.classList.remove('cantada', 'ultima'); }); }
    inicializarTablero75();
}

function actualizarUltimaBolaGrande() {
    var container = document.getElementById('ultimaBolaRuletaContainer'); if (!container) return;
    if (window.cantados.length > 0) {
        var ultimo = window.cantados[window.cantados.length - 1]; var letra = obtenerLetra(ultimo);
        container.innerHTML = '<div class="ultima-bola-ruleta"><div class="bola-grande" id="bolaGrandeRuleta"><span class="bola-letra">' + letra + '</span><span class="bola-numero">' + ultimo + '</span></div><div class="bolas-chicas-ruleta" id="bolasChicasRuleta"></div></div>';
        setTimeout(function() { var bola = document.getElementById('bolaGrandeRuleta'); if (bola) { bola.style.animation = 'none'; bola.offsetHeight; bola.style.animation = 'bolaEntrada 0.5s ease-out'; } }, 10);
    } else {
        container.innerHTML = '<div class="ultima-bola-ruleta"><div class="bola-grande"><span class="bola-letra">-</span><span class="bola-numero">--</span></div><div class="bolas-chicas-ruleta" id="bolasChicasRuleta"></div></div>';
    }
    actualizarUltimasBolasChicas();
}

function actualizarUltimasBolasChicas() {
    var container = document.getElementById('bolasChicasRuleta'); if (!container) return;
    var ultimos = window.cantados.slice(-5).reverse(); container.innerHTML = '';
    if (ultimos.length > 0) { ultimos.forEach(function(num, i) { var bola = document.createElement('div'); bola.className = 'bola-mini' + (i === 0 ? ' ultima-mini' : ''); bola.textContent = num; container.appendChild(bola); }); }
    else { for (var j = 0; j < 5; j++) { var bolaVacia = document.createElement('div'); bolaVacia.className = 'bola-mini'; bolaVacia.style.opacity = '0.3'; bolaVacia.textContent = '--'; container.appendChild(bolaVacia); } }
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
        var count = 0; snap.forEach(function(child) { var c = child.val(); if (c.estado === 'asignado' && window.jugadoresActivos.indexOf(c.asignadoA) !== -1) count++; }); 
        var el = document.getElementById('onlineCount'); if (el) el.innerHTML = '👥 JUGADORES: ' + count + ' | 🏆 Ganadores: ' + window.ganadoresPartida + '/2'; 
        var elMobile = document.getElementById('onlineCountMobile'); if (elMobile) elMobile.textContent = '👥 ' + count;
    }); 
}

function actualizarEtapas() {
    var btnAuto = document.getElementById('btnAutoMobile'); var btnManual = document.getElementById('drawBtnMobile');
    var btnProg = document.getElementById('btnProgramarMobile'); var btnReiniciarRuleta = document.getElementById('btnReiniciarRuleta');
    var navRuleta = document.getElementById('navRuleta'); var btnComenzar = document.getElementById('btnComenzarPartida');
    
    if (window.etapaActual >= 2) {
        var checkJ = document.getElementById('statusJugadoresCheck'); if (checkJ) checkJ.textContent = '✅';
        var cardJ = document.getElementById('statusJugadoresCard'); if (cardJ) cardJ.classList.add('completado');
        var btnEtapa2 = document.getElementById('btnEtapa2Mobile'); if (btnEtapa2) btnEtapa2.disabled = false;
    }
    if (window.etapaActual >= 3) {
        var checkP = document.getElementById('statusPatronCheck'); if (checkP) checkP.textContent = '✅';
        var cardP = document.getElementById('statusPatronCard'); if (cardP) cardP.classList.add('completado');
        if (btnComenzar) {
            btnComenzar.disabled = window.partidaIniciada;
            if (window.partidaIniciada) { btnComenzar.textContent = '✅ PARTIDA INICIADA'; btnComenzar.style.animation = 'none'; btnComenzar.style.boxShadow = 'none'; }
            else { btnComenzar.textContent = '🚀 INICIAR PARTIDA'; btnComenzar.style.animation = 'glowComenzar 2s infinite'; btnComenzar.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)'; }
        }
        if (btnAuto) btnAuto.disabled = window.enPausa || !window.partidaIniciada;
        if (btnManual) { btnManual.disabled = window.enPausa || !window.partidaIniciada; btnManual.style.pointerEvents = (window.enPausa || !window.partidaIniciada) ? 'none' : 'all'; }
        if (btnProg) btnProg.disabled = window.enPausa || !window.partidaIniciada;
        if (navRuleta) { navRuleta.style.opacity = '1'; navRuleta.style.pointerEvents = 'all'; }
        if (btnReiniciarRuleta) btnReiniciarRuleta.style.display = window.partidaIniciada ? 'block' : 'none';
    } else {
        if (navRuleta) { navRuleta.style.opacity = '0.5'; navRuleta.style.pointerEvents = 'none'; }
        if (btnReiniciarRuleta) btnReiniciarRuleta.style.display = 'none';
    }
}

function abrirModal(id) { var m = document.getElementById(id); if (m) m.classList.add('activo'); }
function cerrarModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('activo'); }

// ============ ETAPA 1: JUGADORES ============
window.abrirModalCartones = function() { 
    var modal = document.getElementById('modalCartones'), lista = document.getElementById('listaCheckCartones'); 
    if (!modal || !lista) return; abrirModal('modalCartones'); lista.innerHTML = "<p style='color:var(--gold);'>Cargando...</p>"; 
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { 
        lista.innerHTML = ''; if (!snap.exists()) { lista.innerHTML = "<p style='color:white;'>No hay cartones</p>"; return; } 
        var jugadoresUnicos = new Set(); 
        snap.forEach(function(child) { 
            var c = child.val(); 
            if (c.asignadoA && !jugadoresUnicos.has(c.asignadoA)) { 
                jugadoresUnicos.add(c.asignadoA); var item = document.createElement('div'); item.className = 'item-jugador'; 
                item.setAttribute('data-jugador', c.asignadoA.toLowerCase()); 
                if (window.jugadoresActivos.indexOf(c.asignadoA) !== -1) item.classList.add('seleccionado'); 
                item.onclick = function() { var idx = window.jugadoresActivos.indexOf(c.asignadoA); if (idx !== -1) { window.jugadoresActivos.splice(idx, 1); item.classList.remove('seleccionado'); } else { window.jugadoresActivos.push(c.asignadoA); item.classList.add('seleccionado'); } guardarEstado(); }; 
                var count = 0; snap.forEach(function(ch) { if (ch.val().asignadoA === c.asignadoA) count++; }); 
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + c.asignadoA + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>'; 
                lista.appendChild(item); 
            } 
        }); 
        if (jugadoresUnicos.size === 0) lista.innerHTML = "<p style='color:white;'>No hay jugadores</p>"; 
    }); 
};

window.buscarJugadorModal = function(t) { document.querySelectorAll('.item-jugador').forEach(function(i) { var j = i.getAttribute('data-jugador'); i.style.display = (j && j.indexOf(t.toLowerCase()) !== -1) ? '' : 'none'; }); };
window.seleccionarTodosJugadores = function() { 
    var items = document.querySelectorAll('.item-jugador'); var todos = Array.from(items).every(function(i) { return i.classList.contains('seleccionado'); }); 
    if (todos) { window.jugadoresActivos = []; items.forEach(function(i) { i.classList.remove('seleccionado'); }); } 
    else { var nombres = new Set(); db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { snap.forEach(function(c) { if (c.val().asignadoA) nombres.add(c.val().asignadoA); }); window.jugadoresActivos = Array.from(nombres); items.forEach(function(i) { i.classList.add('seleccionado'); }); guardarEstado(); }); } 
};
window.confirmarJugadores = function() { 
    if (window.jugadoresActivos.length === 0) { mostrarToast('⚠️ Selecciona al menos un jugador', 'error'); return; } 
    db.ref('partidas/' + SALA_ID + '/jugadoresActivos').set(window.jugadoresActivos); window.etapaActual = 2; guardarEstado(); actualizarEtapas(); actualizarOnlineCount(); 
    cerrarModal('modalCartones'); mostrarToast('✅ Jugadores confirmados', 'success'); 
};

// ============ ETAPA 2: PATRÓN ============
window.abrirModalPatron = function() { 
    var modal = document.getElementById('modalPatron'), grid = document.getElementById('gridDibujoPatron'); 
    if (!modal || !grid) return; abrirModal('modalPatron'); grid.innerHTML = ''; 
    window.patronBingo.forEach(function(a, i) { var celda = document.createElement('div'); celda.className = 'celda-patron' + (a ? ' activa' : ''); if (i === 12) celda.innerHTML = '⭐'; celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); }; grid.appendChild(celda); }); 
};
window.confirmarPatron = function() { 
    db.ref('partidas/' + SALA_ID + '/patron').set(window.patronBingo); window.etapaActual = 3; window.juegoActivo = true; guardarEstado(); actualizarEtapas(); 
    cerrarModal('modalPatron'); mostrarToast('✅ Patrón confirmado. Presiona INICIAR PARTIDA', 'success'); 
};
window.aplicarPredefinido = function(t) { 
    if (t === 'lleno') window.patronBingo = Array(25).fill(true); 
    if (t === 'limpiar') window.patronBingo = Array(25).fill(false); 
    if (t === 'equis') { window.patronBingo = Array(25).fill(false); [0,4,6,8,12,16,18,20,24].forEach(function(p) { window.patronBingo[p] = true; }); } 
    guardarEstado(); window.abrirModalPatron(); 
};

// ============ TEMPORIZADOR ============
window.programarJuego = function() {
    var inputMin = document.getElementById('minutosInicio') || document.getElementById('minutosInicioMobile');
    var valor = inputMin ? inputMin.value.trim() : '0'; var tiempoTotal;
    if (valor.includes(':')) { var partes = valor.split(':'); tiempoTotal = (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0); }
    else { var num = parseFloat(valor); if (isNaN(num) || num <= 0) { mostrarToast('⚠️ Ingresa un tiempo válido', 'error'); return; } if (valor.includes('.')) { var partes = valor.split('.'); tiempoTotal = parseInt(partes[0]) * 60 + parseInt(partes[1] || '0'); } else { tiempoTotal = Math.round(num * 60); } }
    if (tiempoTotal <= 0) { mostrarToast('⚠️ El tiempo debe ser mayor a 0', 'error'); return; }
    var mins = Math.floor(tiempoTotal / 60), segs = tiempoTotal % 60; var tiempoStr = mins > 0 ? mins + ' min ' + segs + ' seg' : segs + ' seg';
    var modo = confirm('⏰ ' + tiempoStr + '\n\n¿Modo AUTOMÁTICO al llegar a 0?\n✅ Aceptar = Auto\n❌ Cancelar = Manual');
    window.modoJuegoSeleccionado = modo ? 'automatico' : 'manual'; if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
    var btnProg = document.getElementById('btnProgramar') || document.getElementById('btnProgramarMobile'); if (btnProg) { btnProg.textContent = '⏳ ESPERANDO...'; btnProg.disabled = true; }
    var tiempo = tiempoTotal; var cronVisual = document.getElementById('cronometroVisual'); var cronVisualRuleta = document.getElementById('cronometroVisualRuleta');
    if (cronVisual) cronVisual.style.display = 'block'; if (cronVisualRuleta) cronVisualRuleta.style.display = 'block';
    actualizarCronometroVisual(tiempo, tiempoTotal);
    db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo, estado: 'iniciando', mensajeAdmin: '⏰ La partida comienza en ' + tiempoStr, timestamp: Date.now() });
    mostrarToast('⏰ Cronómetro: ' + tiempoStr, 'success');
    window.intervaloTemporizador = setInterval(function() {
        tiempo--; actualizarCronometroVisual(tiempo, tiempoTotal); db.ref('partidas/' + SALA_ID).update({ cronometro: tiempo });
        if (tiempo <= 0) { clearInterval(window.intervaloTemporizador); window.intervaloTemporizador = null; if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; } if (cronVisual) cronVisual.style.display = 'none'; if (cronVisualRuleta) cronVisualRuleta.style.display = 'none'; window.partidaIniciada = true; db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cronometro: 0, partidaIniciada: true, mensajeAdmin: '▶️ ¡Juego iniciado!', timestamp: Date.now() }); if ('speechSynthesis' in window) { var msg = new SpeechSynthesisUtterance('¡Es hora!'); msg.lang = 'es-ES'; window.speechSynthesis.speak(msg); } mostrarToast('▶️ ¡Juego iniciado!', 'success'); actualizarEtapas(); if (window.modoJuegoSeleccionado === 'automatico') window.iniciarBingoAutomatico(); }
    }, 1000);
};

function actualizarCronometroVisual(tiempo, tiempoTotal) {
    var mins = Math.floor(tiempo / 60), segs = tiempo % 60; var tiempoStr = String(mins).padStart(2,'0') + ':' + String(segs).padStart(2,'0');
    var porcentaje = ((tiempoTotal - tiempo) / tiempoTotal) * 100;
    var elConf = document.getElementById('cronometroVisualTiempo'); if (elConf) elConf.textContent = tiempoStr;
    var elRul = document.getElementById('cronometroVisualRuletaTiempo'); if (elRul) elRul.textContent = tiempoStr;
    var progConf = document.getElementById('cronometroVisualProgreso'); if (progConf) progConf.style.width = porcentaje + '%';
    var progRul = document.getElementById('cronometroVisualRuletaProgreso'); if (progRul) progRul.style.width = porcentaje + '%';
}

// ============ BINGO AUTOMÁTICO ============
window.iniciarBingoAutomatico = function() { 
    if (window.modoAutomatico || window.enPausa || !window.partidaIniciada) return; 
    window.modoAutomatico = true; window.bingoDetectado = false; 
    var btnAuto = document.getElementById('btnAutoMobile'); if (btnAuto) { btnAuto.textContent = '⏸️ DETENER'; btnAuto.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; btnAuto.onclick = window.detenerBingoAutomatico; } 
    var btnManual = document.getElementById('drawBtnMobile'); if (btnManual) { btnManual.disabled = true; btnManual.style.opacity = '0.5'; btnManual.style.pointerEvents = 'none'; } 
    var btnProg = document.getElementById('btnProgramarMobile'); if (btnProg) { btnProg.disabled = true; btnProg.style.opacity = '0.4'; }
    function cantarAuto() { if (!window.modoAutomatico || window.enPausa) return; if (window.cantados.length >= 75) { window.detenerBingoAutomatico(); return; } var b, i = 0; do { b = Math.floor(Math.random()*75)+1; i++; } while (window.cantados.indexOf(b) !== -1 && i < 1000); cantarBola(b); verificarTodosLosCartones(); verificarPausa(); } 
    window.intervaloAutomatico = setInterval(cantarAuto, 11000); setTimeout(cantarAuto, 500); 
    db.ref('partidas/' + SALA_ID).update({ modo: 'automatico' }); mostrarToast('🤖 Auto INICIADO', 'success'); 
};

window.detenerBingoAutomatico = function() { 
    window.modoAutomatico = false; if (window.intervaloAutomatico) { clearInterval(window.intervaloAutomatico); window.intervaloAutomatico = null; } 
    var btnAuto = document.getElementById('btnAutoMobile'); if (btnAuto) { btnAuto.textContent = '🤖 AUTO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; } 
    var btnManual = document.getElementById('drawBtnMobile'); if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; } 
    var btnProg = document.getElementById('btnProgramarMobile'); if (btnProg) { btnProg.disabled = false; btnProg.style.opacity = '1'; }
    db.ref('partidas/' + SALA_ID).update({ modo: 'manual' }); mostrarToast('🤖 Auto DETENIDO', 'error'); 
};

function verificarPausa() { 
    if (window.cantados.length > 0 && window.cantados.length % 25 === 0 && window.cantados.length < 75 && !window.enPausa) { 
        window.enPausa = true; db.ref('partidas/' + SALA_ID).update({ estado: 'pausa', pausa: true, mensajeAdmin: '⏸️ PAUSA 1 minuto', timestamp: Date.now() }); 
        if (window.modoAutomatico) window.detenerBingoAutomatico(); actualizarEtapas(); mostrarToast('⏸️ PAUSA 1 minuto', 'error'); 
        window.pausaTimeout = setTimeout(function() { window.enPausa = false; db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', pausa: false, mensajeAdmin: '▶️ Reanudado', timestamp: Date.now() }); actualizarEtapas(); mostrarToast('✅ Pausa terminada', 'success'); }, 60000); 
    } 
}

function cantarBola(bola) {
    window.cantados.push(bola); guardarEstado();
    document.querySelectorAll('.celda-movil.ultima').forEach(function(c) { c.classList.remove('ultima'); }); inicializarTableroMovil();
    actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas();
    if (window.cartonActual) { actualizarMinicartonEnAmbasVistas(window.cartonActual); verificarBingoAutomatico(window.cartonActual); }
    db.ref('partidas/' + SALA_ID).update({ ultimaBola: bola, ultimaLetra: obtenerLetra(bola), cantados: window.cantados, timestamp: Date.now() });
    if ('speechSynthesis' in window) { var msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola); msg.lang = 'es-ES'; msg.rate = 0.8; window.speechSynthesis.speak(msg); }
    verificarTodosLosCartones();
}

function verificarTodosLosCartones() { 
    if (window.bingoDetectado) return; 
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { 
        var bingos = []; snap.forEach(function(child) { var c = child.val(); if (c.estado === 'asignado' && window.jugadoresActivos.indexOf(c.asignadoA) !== -1 && verificarBingoCarton(c)) { bingos.push(c); } }); 
        bingos.forEach(function(ganador) { if (!window.bingoDetectado) { window.bingoDetectado = true; notificarBingo(ganador); } });
    }); 
}

function verificarBingoCarton(c) { 
    if (!c || !c.carton || !window.patronBingo) return false; 
    for (var i = 0; i < 25; i++) { if (!window.patronBingo[i]) continue; var f = Math.floor(i/5), col = i%5, l = ['B','I','N','G','O'][col]; if (i !== 12 && window.cantados.indexOf(c.carton[l][f]) === -1) return false; } 
    return true; 
}

window.revisarCartonManual = function() { 
    var idB = document.getElementById('idABuscar') || document.getElementById('idABuscarMobile'); if (!idB) { mostrarToast('❌ Error', 'error'); return; } 
    var id = idB.value.trim(); if (!id) { mostrarToast('⚠️ Ingresa un ID', 'error'); return; } 
    var contD = document.getElementById('minicartonVerificador'), contM = document.getElementById('minicartonMobile'); if (contD) contD.innerHTML = '<p style="color:#94a3b8;">Buscando...</p>'; if (contM) contM.innerHTML = '<p style="color:#94a3b8;">Buscando...</p>'; 
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { 
        var encontrado = false, cartonEncontrado = null; snap.forEach(function(child) { var c = child.val(); if ((c.numero == id || c.id === id) && !encontrado) { cartonEncontrado = c; encontrado = true; } }); 
        if (encontrado && cartonEncontrado) { window.cartonActual = cartonEncontrado; actualizarMinicartonEnAmbasVistas(cartonEncontrado); verificarBingoAutomatico(cartonEncontrado); mostrarToast('✅ Cartón encontrado', 'success'); } 
        else { if (contD) contD.innerHTML = '<p style="color:#ef4444;">❌ No encontrado</p>'; if (contM) contM.innerHTML = '<p style="color:#ef4444;">❌ No encontrado</p>'; mostrarToast('❌ No encontrado', 'error'); } 
    }); 
};

function generarHTMLMinicarton(c) { 
    if (!c || !c.carton) return '<p>Error</p>'; 
    var marcados = 0, html = '<div class="minicarton-info"><span><strong>#' + (c.numero||'?') + '</strong></span><span class="minicarton-estado" id="estadoMini">' + (c.asignadoA||'Sin asignar') + '</span></div>'; 
    html += '<div style="text-align:center;font-size:0.6rem;color:#64748b;">Patrón: ' + obtenerNombrePatron() + '</div><table style="width:100%;border-collapse:collapse;"><tr style="background:#ff4d4d;color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>'; 
    for (var f = 0; f < 5; f++) { html += '<tr>'; ['B','I','N','G','O'].forEach(function(l) { var v = c.carton[l][f], centro = (l === 'N' && f === 2); var cantado = window.cantados.indexOf(v) !== -1; if (cantado && !centro) marcados++; var pi = f * 5 + ['B','I','N','G','O'].indexOf(l), ep = window.patronBingo[pi]; html += '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;font-size:0.8rem;'; if (centro) html += 'background:#fef3c7;'; if (cantado && !centro) html += 'background:#10b981;color:white;'; if (ep && !cantado && !centro) html += 'border:2px dashed #f59e0b;background:#fef3c7;'; html += '">' + (centro ? '⭐' : v) + '</td>'; }); html += '</tr>'; } 
    html += '</table><div style="text-align:center;font-size:0.7rem;">Marcados: ' + marcados + '/24</div>'; return html; 
}

function actualizarMinicartonEnAmbasVistas(c) { var html = generarHTMLMinicarton(c); var contD = document.getElementById('minicartonVerificador'); if (contD) contD.innerHTML = html; var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = html; }

function verificarBingoAutomatico(c) { 
    if (!c || !c.carton) return false; var bingo = true, faltantes = []; 
    for (var i = 0; i < 25; i++) { if (!window.patronBingo[i]) continue; var f = Math.floor(i/5), col = i%5, l = ['B','I','N','G','O'][col], v = c.carton[l][f]; if (i !== 12 && window.cantados.indexOf(v) === -1) { bingo = false; faltantes.push(l + '-' + v); } } 
    var el = document.getElementById('estadoMini'); if (el) { if (bingo) { el.className = 'minicarton-estado estado-bingo'; el.textContent = '🎉 BINGO'; } else { el.className = 'minicarton-estado'; el.textContent = 'Faltan: ' + faltantes.slice(0,3).join(', '); el.style.background = '#fef3c7'; el.style.color = '#92400e'; } } 
    return bingo; 
}

function obtenerNombrePatron() { var a = window.patronBingo.filter(function(x){return x;}).length; if (a === 25) return 'Lleno'; if (a === 0) return 'Sin patrón'; if ([0,4,6,8,12,16,18,20,24].every(function(p){return window.patronBingo[p];}) && a === 9) return 'La X'; return a + ' celdas'; }

window.notificarRevisionJugador = function() { var c = window.cartonEnAlerta || window.cartonActual; var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador'; db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: true, jugador: nombre, timestamp: Date.now() }); mostrarToast('🔍 Revisando bingo de ' + nombre, 'success'); };
function finalizarRevision(jugador, resultado) { db.ref('partidas/' + SALA_ID + '/revisando').set({ activo: false }); db.ref('partidas/' + SALA_ID + '/resultadoRevision').set({ jugador: jugador, resultado: resultado, timestamp: Date.now() }); }

function notificarBingo(c) { 
    var aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo'); 
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar'); if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?'); 
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; ab.style.border = '2px solid #ffca28'; } 
    window.cartonEnAlerta = c; reproducirAudioBingo(c.asignadoA || 'Jugador'); mostrarToast('⚠️ Posible BINGO de ' + (c.asignadoA||'Jugador'), 'error'); 
    db.ref('partidas/' + SALA_ID + '/chat').push({ mensaje: '⚠️ Posible BINGO de ' + (c.asignadoA||'Jugador') + ' (Cartón #' + (c.numero||'?') + ')', timestamp: Date.now(), admin: true, sistema: true });
}

function notificarBingoManual(c) { 
    var aj = document.getElementById('alertaJugador'), ac = document.getElementById('alertaCarton'), ab = document.getElementById('alertaBingo'); 
    if (aj) aj.textContent = '👤 ' + (c.asignadoA||'Sin asignar'); if (ac) ac.textContent = '🎫 Cartón #' + (c.numero||'?'); 
    if (ab) { ab.style.display = 'block'; ab.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; ab.style.border = '2px solid #ffca28'; } 
    window.cartonEnAlerta = c; reproducirAudioBingoManual(c.asignadoA || 'Jugador'); mostrarToast('🚨 ¡BINGO cantado!', 'error'); 
    db.ref('partidas/' + SALA_ID).update({ bingoCantado: c.asignadoA || 'Jugador', timestamp: Date.now() }); 
}

function escucharBingosJugadores() { 
    db.ref('bingos/' + SALA_ID).on('child_added', function(snap) { var bingo = snap.val(); db.ref('salas/' + SALA_ID + '/cartones/' + bingo.cartonId).once('value', function(cs) { var c = cs.val(); if (c) { notificarBingoManual(c); } }); }); 
}

// ============ SISTEMA DE CHAT CORREGIDO ============
function escucharSolicitudesChat() {
    db.ref('partidas/' + SALA_ID + '/solicitudChat').on('value', function(snap) {
        var data = snap.val(); if (!data) return;
        var jugador = data.jugador; var mensajeJugador = data.mensaje || 'quiere hablar';
        var idLimpio = jugador.replace(/[^a-zA-Z0-9]/g, '');
        
        var notificacion = document.createElement('div');
        notificacion.style.cssText = 'position:fixed;top:20px;right:20px;background:#1e293b;color:white;padding:15px 20px;border-radius:12px;z-index:500;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:2px solid #f59e0b;max-width:350px;animation:slideDown 0.3s;';
        notificacion.innerHTML = '<div style="font-size:1.1em;margin-bottom:6px;">🙋 <strong>' + jugador + '</strong> pide la palabra</div><div style="font-size:0.8em;color:#94a3b8;margin-bottom:10px;background:#0f172a;padding:8px;border-radius:6px;">' + mensajeJugador + '</div><div style="display:flex;gap:8px;"><button id="btnMostrarChat_' + idLimpio + '" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">✅ MOSTRAR EN CHAT</button><button id="btnRechazarChat_' + idLimpio + '" style="flex:1;padding:8px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">❌ RECHAZAR</button></div>';
        document.body.appendChild(notificacion);
        
        document.getElementById('btnMostrarChat_' + idLimpio).onclick = function() {
            db.ref('partidas/' + SALA_ID + '/chat').push({ mensaje: '🙋 ' + jugador + ': ' + mensajeJugador, timestamp: Date.now(), admin: false, jugador: jugador });
            notificacion.remove(); db.ref('partidas/' + SALA_ID + '/solicitudChat').remove();
            mostrarToast('✅ Mensaje mostrado en chat grupal', 'success');
        };
        document.getElementById('btnRechazarChat_' + idLimpio).onclick = function() {
            notificacion.remove(); db.ref('partidas/' + SALA_ID + '/solicitudChat').remove();
            mostrarToast('❌ Solicitud rechazada', 'error');
        };
        setTimeout(function() { if (notificacion.parentNode) { notificacion.remove(); db.ref('partidas/' + SALA_ID + '/solicitudChat').remove(); } }, 60000);
    });
}

// ============ ALERTA ============
window.cerrarAlerta = function() { var ab = document.getElementById('alertaBingo'); if (ab) { ab.style.display = 'none'; } window.cartonEnAlerta = null; };

window.bingoValido = function() { 
    var c = window.cartonEnAlerta || window.cartonActual; var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador'; 
    if (window.ganadoresPartida >= 2) { mostrarToast('⚠️ Ya hay 2 ganadores', 'error'); return; } 
    if (confirm('¿BINGO VÁLIDO para ' + nombre + '?')) { 
        window.ganadoresPartida++; sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString()); actualizarOnlineCount(); 
        db.ref('partidas/' + SALA_ID).update({ ganadoresCount: window.ganadoresPartida }); finalizarRevision(nombre, 'valido');
        db.ref('partidas/' + SALA_ID + '/erroresJugadores/' + nombre).remove(); window.cerrarAlerta(); reproducirAudioGanador(nombre); 
        mostrarToast('🎉 ¡BINGO VÁLIDO!', 'success');
        db.ref('partidas/' + SALA_ID + '/chat').push({ mensaje: '🎉 ¡BINGO VÁLIDO! ' + nombre + ' es ganador', timestamp: Date.now(), admin: true, sistema: true });
        if (window.ganadoresPartida >= 2) { db.ref('partidas/' + SALA_ID).update({ estado: 'terminado', ganador: nombre, mensajeAdmin: '🏆 ¡Partida terminada!', timestamp: Date.now() }); if (window.modoAutomatico) window.detenerBingoAutomatico(); setTimeout(function() { if (confirm('🎉 ¿NUEVA PARTIDA?')) iniciarNuevaPartida(); }, 1000); } 
        else { db.ref('partidas/' + SALA_ID).update({ mensajeAdmin: '🎉 ¡BINGO! ' + nombre + ' - Aún queda 1 premio', timestamp: Date.now() }); window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null; var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; } 
    } 
};

window.bingoErrado = function() {
    var c = window.cartonEnAlerta || window.cartonActual; var nombre = c ? (c.asignadoA || 'Jugador') : 'Jugador';
    db.ref('partidas/' + SALA_ID + '/erroresJugadores/' + nombre).once('value', function(snap) {
        var errores = snap.val() || 0; errores++; db.ref('partidas/' + SALA_ID + '/erroresJugadores/' + nombre).set(errores);
        if (errores >= 2) { if (confirm('⚠️ ' + nombre + ' tiene ' + errores + ' errores.\n\n¿ELIMINAR jugador?')) { finalizarRevision(nombre, 'errado'); db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', mensajeAdmin: '❌ ' + nombre + ' eliminado', timestamp: Date.now() }); db.ref('partidas/' + SALA_ID + '/chat').push({ mensaje: '❌ ' + nombre + ' eliminado por 2 bingos errados', timestamp: Date.now(), admin: true, sistema: true }); db.ref('partidas/' + SALA_ID + '/erroresJugadores/' + nombre).remove(); window.bingoDetectado = false; window.cerrarAlerta(); window.cartonActual = null; mostrarToast('❌ ' + nombre + ' ELIMINADO', 'error'); } }
        else { if (confirm('⚠️ BINGO ERRADO para ' + nombre + ' (Error ' + errores + '/2)\n\n¿Confirmar?')) { finalizarRevision(nombre, 'errado'); db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', mensajeAdmin: '⚠️ BINGO ERRADO - ' + nombre + ' (' + errores + '/2)', timestamp: Date.now() }); window.bingoDetectado = false; window.cerrarAlerta(); window.cartonActual = null; mostrarToast('⚠️ BINGO ERRADO (' + errores + '/2)', 'error'); } }
    });
};

function iniciarNuevaPartida() { 
    window.cantados = []; window.bingoDetectado = false; window.cartonActual = null; window.cartonEnAlerta = null; 
    window.ganadoresPartida = 0; window.enPausa = false; window.partidaIniciada = false;
    if (window.pausaTimeout) clearTimeout(window.pausaTimeout); if (window.modoAutomatico) window.detenerBingoAutomatico(); 
    sessionStorage.setItem('ganadores_' + SALA_ID, '0'); localStorage.setItem('bingo_cantados_' + SALA_ID, JSON.stringify([])); 
    db.ref('partidas/' + SALA_ID).set({ estado: 'nueva_partida', cantados: [], ultimaBola: null, mensajeAdmin: '🔄 Nueva partida', timestamp: Date.now(), patron: window.patronBingo, jugadoresActivos: window.jugadoresActivos, revisando: { activo: false }, resultadoRevision: null, pausa: false, cronometro: 0, ganadoresCount: 0, partidaIniciada: false }); 
    db.ref('bingos/' + SALA_ID).remove(); db.ref('partidas/' + SALA_ID + '/erroresJugadores').remove(); 
    limpiarTableroCompleto(); actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas();
    var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; 
    var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; 
    var alerta = document.getElementById('alertaBingo'); if (alerta) alerta.style.display = 'none'; 
    var cronVisual = document.getElementById('cronometroVisual'); if (cronVisual) cronVisual.style.display = 'none'; 
    var cronVisualR = document.getElementById('cronometroVisualRuleta'); if (cronVisualR) cronVisualR.style.display = 'none'; 
    var btnProg = document.getElementById('btnProgramarMobile'); if (btnProg) { btnProg.textContent = '⏰ PROGRAMAR'; btnProg.disabled = false; } 
    var btnAuto = document.getElementById('btnAutoMobile'); if (btnAuto) { btnAuto.textContent = '🤖 AUTO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; btnAuto.disabled = true; } 
    var btnManual = document.getElementById('drawBtnMobile'); if (btnManual) { btnManual.disabled = true; btnManual.style.opacity = '0.5'; } 
    var btnReiniciar = document.getElementById('btnReiniciarRuleta'); if (btnReiniciar) btnReiniciar.style.display = 'none';
    var btnComenzar = document.getElementById('btnComenzarPartida'); if (btnComenzar) { btnComenzar.disabled = false; btnComenzar.textContent = '🚀 INICIAR PARTIDA'; btnComenzar.style.animation = 'glowComenzar 2s infinite'; btnComenzar.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)'; }
    actualizarEtapas(); actualizarOnlineCount(); mostrarToast('🔄 Nueva partida', 'success'); 
    setTimeout(function() { db.ref('partidas/' + SALA_ID).update({ estado: 'jugando', cantados: [], timestamp: Date.now() }); }, 2000); 
}

// ============ REINICIAR PARTIDA (SIN CONFIRM) ============
window.reiniciarPartidaGlobal = function() {
    if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico); 
    if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador); 
    if (window.pausaTimeout) clearTimeout(window.pausaTimeout); 
    window.cantados = []; window.patronBingo = Array(25).fill(false); window.jugadoresActivos = []; 
    window.juegoActivo = false; window.modoAutomatico = false; window.bingoDetectado = false; 
    window.etapaActual = 1; window.ganadoresPartida = 0; window.enPausa = false; window.partidaIniciada = false;
    sessionStorage.setItem('ganadores_' + SALA_ID, '0'); 
    ['bingo_cantados_','bingo_patron_','bingo_jugadores_','bingo_activo_','bingo_etapa_'].forEach(function(k) { localStorage.removeItem(k + SALA_ID); }); 
    db.ref('partidas/' + SALA_ID).remove(); db.ref('bingos/' + SALA_ID).remove(); db.ref('partidas/' + SALA_ID + '/erroresJugadores').remove(); 
    limpiarTableroCompleto(); actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas();
    var cont = document.getElementById('minicartonVerificador'); if (cont) cont.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; 
    var contM = document.getElementById('minicartonMobile'); if (contM) contM.innerHTML = '<p style="color:#64748b;">Busca un cartón</p>'; 
    var alerta = document.getElementById('alertaBingo'); if (alerta) alerta.style.display = 'none'; 
    var cronVisual = document.getElementById('cronometroVisual'); if (cronVisual) cronVisual.style.display = 'none'; 
    var cronVisualR = document.getElementById('cronometroVisualRuleta'); if (cronVisualR) cronVisualR.style.display = 'none'; 
    var bp = document.getElementById('btnProgramarMobile'); if (bp) { bp.textContent = '⏰ PROGRAMAR'; bp.disabled = true; } 
    var ba = document.getElementById('btnAutoMobile'); if (ba) { ba.textContent = '🤖 AUTO'; ba.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; ba.onclick = window.iniciarBingoAutomatico; ba.disabled = true; } 
    var bm = document.getElementById('drawBtnMobile'); if (bm) { bm.disabled = true; bm.style.opacity = '0.5'; bm.style.pointerEvents = 'none'; } 
    var btnReiniciarRuleta = document.getElementById('btnReiniciarRuleta'); if (btnReiniciarRuleta) btnReiniciarRuleta.style.display = 'none';
    var btnReiniciarConfig = document.getElementById('btnReiniciarPartida'); if (btnReiniciarConfig) btnReiniciarConfig.style.display = 'none';
    var btnComenzar = document.getElementById('btnComenzarPartida'); if (btnComenzar) { btnComenzar.disabled = true; btnComenzar.textContent = '🚀 INICIAR PARTIDA'; btnComenzar.style.animation = 'glowComenzar 2s infinite'; btnComenzar.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)'; }
    var checkJ = document.getElementById('statusJugadoresCheck'); if (checkJ) checkJ.textContent = '❌';
    var cardJ = document.getElementById('statusJugadoresCard'); if (cardJ) cardJ.classList.remove('completado');
    var textoJ = document.getElementById('statusJugadoresTexto'); if (textoJ) textoJ.textContent = 'No seleccionados';
    var checkP = document.getElementById('statusPatronCheck'); if (checkP) checkP.textContent = '❌';
    var cardP = document.getElementById('statusPatronCard'); if (cardP) cardP.classList.remove('completado');
    var textoP = document.getElementById('statusPatronTexto'); if (textoP) textoP.textContent = 'No configurado';
    var btnEtapa2 = document.getElementById('btnEtapa2Mobile'); if (btnEtapa2) btnEtapa2.disabled = true;
    actualizarEtapas(); actualizarOnlineCount(); mostrarToast('🔄 Todo reiniciado', 'success'); 
    if (typeof navegarA === 'function') navegarA('config');
};

// ============ TECLAS ============
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { cerrarModal('modalCartones'); cerrarModal('modalPatron'); }
    if (e.code === 'Space' && window.etapaActual === 3 && !window.modoAutomatico && !window.enPausa && window.partidaIniciada) { 
        var tag = (e.target.tagName || '').toLowerCase(); if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !e.target.isContentEditable) { e.preventDefault(); var btn = document.getElementById('drawBtnMobile'); if (btn) btn.click(); } 
    }
});

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel iniciado - Sala:', SALA_ID);
    inicializarTablero75(); escucharBingosJugadores(); escucharSolicitudesChat(); actualizarEtapas(); actualizarOnlineCount(); sincronizarEstadoDesdeFirebase();
    var cronVisual = document.getElementById('cronometroVisual'); if (cronVisual) cronVisual.style.display = 'none';
    var cronVisualR = document.getElementById('cronometroVisualRuleta'); if (cronVisualR) cronVisualR.style.display = 'none';
    if (window.juegoActivo && window.etapaActual === 3) actualizarEtapas();
    db.ref('partidas/' + SALA_ID).on('value', function(snap) { 
        var data = snap.val(); 
        if (data && data.cantados && data.cantados.length > window.cantados.length) { window.cantados = data.cantados; guardarEstado(); inicializarTablero75(); actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas(); if (window.cartonActual) { actualizarMinicartonEnAmbasVistas(window.cartonActual); verificarBingoAutomatico(window.cartonActual); } } 
        if (data && data.pausa !== undefined && data.pausa !== window.enPausa) { window.enPausa = data.pausa; actualizarEtapas(); } 
        if (data && data.ganadoresCount !== undefined && data.ganadoresCount !== window.ganadoresPartida) { window.ganadoresPartida = data.ganadoresCount; sessionStorage.setItem('ganadores_' + SALA_ID, window.ganadoresPartida.toString()); actualizarOnlineCount(); } 
        if (data && data.partidaIniciada !== undefined && data.partidaIniciada !== window.partidaIniciada) { window.partidaIniciada = data.partidaIniciada; actualizarEtapas(); }
    });
});
