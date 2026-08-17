// ruleta.js - Panel de Control supabaseClient
var SALA_ID = localStorage.getItem('salaActiva') || 'bingo-default';

window.cantados = [];
window.patronBingo = Array(25).fill(false);
window.jugadoresActivos = [];
window.cartonActual = null;
window.cartonEnAlerta = null;
window.juegoActivo = false;
window.modoAutomatico = false;
window.intervaloAutomatico = null;
window.intervaloTemporizador = null;
window.bingoDetectado = false;
window.etapaActual = 1;
window.modoJuegoSeleccionado = null;
window.ganadoresPartida = 0;
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

// ============ AUDIO ============
function reproducirAudioBingo(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Alerta! Posible Bingo de ' + n); m.lang = 'es-ES'; m.rate = 0.85; window.speechSynthesis.speak(m); } }
function reproducirAudioBingoManual(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Bingo! ' + n + ' cantó Bingo'); m.lang = 'es-ES'; m.rate = 0.9; window.speechSynthesis.speak(m); } }
function reproducirAudioGanador(n) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var m = new SpeechSynthesisUtterance('¡Ganador! ' + n); m.lang = 'es-ES'; m.rate = 0.9; window.speechSynthesis.speak(m); } }

// ============ SUPABASE ============
async function guardarPartidaEnSupabase() {
    try {
        const { data, error } = await supabaseClient            .from('partidas')
            .upsert({
                sala_id: SALA_ID,
                estado: window.partidaIniciada ? 'jugando' : 'configuracion',
                cantados: window.cantados,
                patron: window.patronBingo,
                jugadores_activos: window.jugadoresActivos,
                ultima_bola: window.cantados.length > 0 ? window.cantados[window.cantados.length - 1] : null,
                cronometro: 0,
                partida_iniciada: window.partidaIniciada,
                ganadores_count: window.ganadoresPartida,
                pausa: window.enPausa,
                timestamp: Date.now()
            });
        if (error) console.error('Error guardando partida:', error);
    } catch (e) { console.error('Error:', e); }
}

async function cargarPartidaDesdeSupabase() {
    try {
        const { data, error } = await supabaseClient            .from('partidas')
            .select('*')
            .eq('sala_id', SALA_ID)
            .single();
        if (error && error.code !== 'PGRST116') { console.error('Error:', error); return; }
        if (data) {
            if (data.cantados && Array.isArray(data.cantados)) window.cantados = data.cantados;
            if (data.patron && Array.isArray(data.patron)) window.patronBingo = data.patron;
            if (data.jugadores_activos && Array.isArray(data.jugadores_activos)) window.jugadoresActivos = data.jugadores_activos;
            if (data.partida_iniciada) window.partidaIniciada = true;
            if (data.ganadores_count) window.ganadoresPartida = data.ganadores_count;
            if (data.estado) {
                if (data.estado === 'jugando') { window.etapaActual = 3; window.juegoActivo = true; }
            }
            if (window.etapaActual >= 2) actualizarEtapas();
            if (window.etapaActual >= 3) actualizarEtapas();
        }
    } catch (e) { console.error('Error:', e); }
}

// ============ TABLERO ============
function inicializarTablero75() {
    var grid = document.getElementById('historyGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) {
        var d = document.createElement('div'); d.className = 'celda-seguimiento'; d.id = 'seguimiento-' + i; d.textContent = i;
        if (window.cantados.indexOf(i) !== -1) d.classList.add('cantada');
        grid.appendChild(d);
    }
    actualizarUltimaBolaGrande(); actualizarUltimasBolasChicas(); inicializarTableroMovil();
}

function inicializarTableroMovil() {
    var grid = document.getElementById('historyGridMobile'); if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 75; i++) {
        var d = document.createElement('div'); d.className = 'celda-movil'; d.textContent = i;
        if (window.cantados.indexOf(i) !== -1) d.classList.add('cantada');
        grid.appendChild(d);
    }
}

function limpiarTableroCompleto() {
    var gridDesktop = document.getElementById('historyGrid');
    if (gridDesktop) { gridDesktop.querySelectorAll('.celda-seguimiento').forEach(function(c) { c.classList.remove('cantada', 'ultima'); }); }
    var gridMobile = document.getElementById('historyGridMobile');
    if (gridMobile) { gridMobile.querySelectorAll('.celda-movil').forEach(function(c) { c.classList.remove('cantada', 'ultima'); }); }
    inicializarTablero75();
}

// ============ ÚLTIMA BOLA ============
function actualizarUltimaBolaGrande() {
    var container = document.getElementById('ultimaBolaRuletaContainer');
    if (!container) return;
    if (window.cantados.length > 0) {
        var ultimo = window.cantados[window.cantados.length - 1];
        var letra = obtenerLetra(ultimo);
        container.innerHTML = '<div class="ultima-bola-ruleta"><div class="bola-grande"><span class="bola-letra">' + letra + '</span><span class="bola-numero">' + ultimo + '</span></div><div class="bolas-chicas-ruleta" id="bolasChicasRuleta"></div></div>';
    } else {
        container.innerHTML = '<div class="ultima-bola-ruleta"><div class="bola-grande"><span class="bola-letra">-</span><span class="bola-numero">--</span></div><div class="bolas-chicas-ruleta" id="bolasChicasRuleta"></div></div>';
    }
    actualizarUltimasBolasChicas();
}

function actualizarUltimasBolasChicas() {
    var container = document.getElementById('bolasChicasRuleta');
    if (!container) return;
    var ultimos = window.cantados.slice(-5).reverse();
    container.innerHTML = '';
    if (ultimos.length > 0) {
        ultimos.forEach(function(num, i) {
            var bola = document.createElement('div');
            bola.className = 'bola-mini' + (i === 0 ? ' ultima-mini' : '');
            bola.textContent = num;
            container.appendChild(bola);
        });
    } else {
        for (var j = 0; j < 5; j++) {
            var bola = document.createElement('div');
            bola.className = 'bola-mini'; bola.style.opacity = '0.3'; bola.textContent = '--';
            container.appendChild(bola);
        }
    }
}

function obtenerLetra(n) { if (n <= 15) return 'B'; if (n <= 30) return 'I'; if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O'; }

// ============ ETAPAS ============
function actualizarEtapas() {
    var btnAuto = document.getElementById('btnAutoMobile');
    var btnManual = document.getElementById('drawBtnMobile');
    var btnProg = document.getElementById('btnProgramarMobile');
    var btnReiniciarRuleta = document.getElementById('btnReiniciarRuleta');
    var navRuleta = document.getElementById('navRuleta');
    var btnComenzar = document.getElementById('btnComenzarPartida');
    
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
    if (!modal || !lista) return;
    abrirModal('modalCartones');
    lista.innerHTML = "<p style='color:var(--gold);'>Cargando...</p>";
    supabase.from('cartones').select('*').eq('sala_id', SALA_ID).then(function(result) {
        lista.innerHTML = '';
        var data = result.data;
        if (!data || data.length === 0) { lista.innerHTML = "<p style='color:white;'>No hay cartones</p>"; return; }
        var jugadoresUnicos = new Set();
        data.forEach(function(c) {
            if (c.asignado_a && !jugadoresUnicos.has(c.asignado_a)) {
                jugadoresUnicos.add(c.asignado_a);
                var item = document.createElement('div');
                item.className = 'item-jugador';
                item.setAttribute('data-jugador', c.asignado_a.toLowerCase());
                if (window.jugadoresActivos.indexOf(c.asignado_a) !== -1) item.classList.add('seleccionado');
                item.onclick = function() {
                    var idx = window.jugadoresActivos.indexOf(c.asignado_a);
                    if (idx !== -1) { window.jugadoresActivos.splice(idx, 1); item.classList.remove('seleccionado'); }
                    else { window.jugadoresActivos.push(c.asignado_a); item.classList.add('seleccionado'); }
                };
                var count = data.filter(function(ch) { return ch.asignado_a === c.asignado_a; }).length;
                item.innerHTML = '<div style="font-size:1.5rem;">👤</div><div style="color:white;font-weight:bold;">' + c.asignado_a + '</div><div style="color:#ffca28;font-size:0.7rem;">' + count + ' cart.</div>';
                lista.appendChild(item);
            }
        });
        if (jugadoresUnicos.size === 0) lista.innerHTML = "<p style='color:white;'>No hay jugadores</p>";
    });
};

window.buscarJugadorModal = function(t) {
    document.querySelectorAll('.item-jugador').forEach(function(i) {
        var j = i.getAttribute('data-jugador');
        i.style.display = (j && j.indexOf(t.toLowerCase()) !== -1) ? '' : 'none';
    });
};

window.seleccionarTodosJugadores = function() {
    var items = document.querySelectorAll('.item-jugador');
    var todos = Array.from(items).every(function(i) { return i.classList.contains('seleccionado'); });
    if (todos) { window.jugadoresActivos = []; items.forEach(function(i) { i.classList.remove('seleccionado'); }); }
    else {
        var nombres = new Set();
        supabase.from('cartones').select('asignado_a').eq('sala_id', SALA_ID).not('asignado_a', 'is', null).then(function(result) {
            result.data.forEach(function(c) { if (c.asignado_a) nombres.add(c.asignado_a); });
            window.jugadoresActivos = Array.from(nombres);
            items.forEach(function(i) { i.classList.add('seleccionado'); });
        });
    }
};

window.confirmarJugadores = function() {
    if (window.jugadoresActivos.length === 0) { mostrarToast('⚠️ Selecciona al menos un jugador', 'error'); return; }
    window.etapaActual = 2;
    actualizarEtapas();
    cerrarModal('modalCartones');
    guardarPartidaEnSupabase();
    mostrarToast('✅ Jugadores confirmados', 'success');
};

// ============ ETAPA 2: PATRÓN ============
window.abrirModalPatron = function() {
    var modal = document.getElementById('modalPatron'), grid = document.getElementById('gridDibujoPatron');
    if (!modal || !grid) return;
    abrirModal('modalPatron');
    grid.innerHTML = '';
    window.patronBingo.forEach(function(a, i) {
        var celda = document.createElement('div');
        celda.className = 'celda-patron' + (a ? ' activa' : '');
        if (i === 12) celda.innerHTML = '⭐';
        celda.onclick = function() { window.patronBingo[i] = !window.patronBingo[i]; celda.classList.toggle('activa'); };
        grid.appendChild(celda);
    });
};

window.confirmarPatron = function() {
    window.etapaActual = 3;
    window.juegoActivo = true;
    actualizarEtapas();
    cerrarModal('modalPatron');
    guardarPartidaEnSupabase();
    mostrarToast('✅ Patrón confirmado', 'success');
};

window.aplicarPredefinido = function(t) {
    if (t === 'lleno') window.patronBingo = Array(25).fill(true);
    if (t === 'limpiar') window.patronBingo = Array(25).fill(false);
    if (t === 'equis') { window.patronBingo = Array(25).fill(false); [0,4,6,8,12,16,18,20,24].forEach(function(p) { window.patronBingo[p] = true; }); }
    window.abrirModalPatron();
};

// ============ CANTAR BOLA ============
function cantarBola(bola) {
    window.cantados.push(bola);
    document.querySelectorAll('.celda-movil.ultima').forEach(function(c) { c.classList.remove('ultima'); });
    inicializarTableroMovil();
    actualizarUltimaBolaGrande();
    actualizarUltimasBolasChicas();
    guardarPartidaEnSupabase();
    if ('speechSynthesis' in window) { var msg = new SpeechSynthesisUtterance(obtenerLetra(bola) + ' ' + bola); msg.lang = 'es-ES'; msg.rate = 0.8; window.speechSynthesis.speak(msg); }
}

// ============ BINGO AUTOMÁTICO ============
window.iniciarBingoAutomatico = function() {
    if (window.modoAutomatico || window.enPausa || !window.partidaIniciada) return;
    window.modoAutomatico = true;
    var btnAuto = document.getElementById('btnAutoMobile');
    if (btnAuto) { btnAuto.textContent = '⏸️ DETENER'; btnAuto.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; btnAuto.onclick = window.detenerBingoAutomatico; }
    var btnManual = document.getElementById('drawBtnMobile');
    if (btnManual) { btnManual.disabled = true; btnManual.style.opacity = '0.5'; }
    function cantarAuto() {
        if (!window.modoAutomatico || window.enPausa) return;
        if (window.cantados.length >= 75) { window.detenerBingoAutomatico(); return; }
        var b; do { b = Math.floor(Math.random()*75)+1; } while (window.cantados.indexOf(b) !== -1);
        cantarBola(b);
        verificarPausa();
    }
    window.intervaloAutomatico = setInterval(cantarAuto, 11000);
    setTimeout(cantarAuto, 500);
    mostrarToast('🤖 Auto INICIADO', 'success');
};

window.detenerBingoAutomatico = function() {
    window.modoAutomatico = false;
    if (window.intervaloAutomatico) { clearInterval(window.intervaloAutomatico); window.intervaloAutomatico = null; }
    var btnAuto = document.getElementById('btnAutoMobile');
    if (btnAuto) { btnAuto.textContent = '🤖 AUTO'; btnAuto.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)'; btnAuto.onclick = window.iniciarBingoAutomatico; }
    var btnManual = document.getElementById('drawBtnMobile');
    if (btnManual) { btnManual.disabled = false; btnManual.style.opacity = '1'; btnManual.style.pointerEvents = 'all'; }
    mostrarToast('🤖 Auto DETENIDO', 'error');
};

function verificarPausa() {
    if (window.cantados.length > 0 && window.cantados.length % 25 === 0 && window.cantados.length < 75 && !window.enPausa) {
        window.enPausa = true;
        guardarPartidaEnSupabase();
        if (window.modoAutomatico) window.detenerBingoAutomatico();
        actualizarEtapas();
        mostrarToast('⏸️ PAUSA 1 minuto', 'error');
        window.pausaTimeout = setTimeout(function() {
            window.enPausa = false;
            guardarPartidaEnSupabase();
            actualizarEtapas();
            mostrarToast('✅ Pausa terminada', 'success');
        }, 60000);
    }
}

// ============ ALERTA ============
window.cerrarAlerta = function() {
    var ab = document.getElementById('alertaBingo');
    if (ab) ab.style.display = 'none';
    window.cartonEnAlerta = null;
};

window.bingoValido = function() {
    var c = window.cartonEnAlerta;
    var nombre = c ? (c.asignado_a || 'Jugador') : 'Jugador';
    if (window.ganadoresPartida >= 2) { mostrarToast('⚠️ Ya hay 2 ganadores', 'error'); return; }
    if (confirm('¿BINGO VÁLIDO para ' + nombre + '?')) {
        window.ganadoresPartida++;
        guardarPartidaEnSupabase();
        window.cerrarAlerta();
        reproducirAudioGanador(nombre);
        mostrarToast('🎉 ¡BINGO VÁLIDO!', 'success');
        supabase.from('chat').insert({ sala_id: SALA_ID, mensaje: '🎉 ¡BINGO VÁLIDO! ' + nombre + ' es ganador', admin: true, sistema: true, timestamp: Date.now() }).then(function() {});
        if (window.ganadoresPartida >= 2) {
            if (window.modoAutomatico) window.detenerBingoAutomatico();
            setTimeout(function() { if (confirm('🎉 ¿NUEVA PARTIDA?')) reiniciarPartidaGlobal(); }, 1000);
        }
    }
};

window.bingoErrado = function() {
    var c = window.cartonEnAlerta;
    var nombre = c ? (c.asignado_a || 'Jugador') : 'Jugador';
    if (confirm('⚠️ ¿BINGO ERRADO para ' + nombre + '?')) {
        window.cerrarAlerta();
        mostrarToast('❌ BINGO ERRADO', 'error');
    }
};

// ============ REINICIAR ============
window.reiniciarPartidaGlobal = function() {
    window.cantados = [];
    window.patronBingo = Array(25).fill(false);
    window.jugadoresActivos = [];
    window.juegoActivo = false;
    window.modoAutomatico = false;
    window.bingoDetectado = false;
    window.etapaActual = 1;
    window.ganadoresPartida = 0;
    window.enPausa = false;
    window.partidaIniciada = false;
    if (window.intervaloAutomatico) clearInterval(window.intervaloAutomatico);
    if (window.intervaloTemporizador) clearInterval(window.intervaloTemporizador);
    if (window.pausaTimeout) clearTimeout(window.pausaTimeout);
    
    supabase.from('partidas').delete().eq('sala_id', SALA_ID).then(function() {});
    supabase.from('bingos').delete().eq('sala_id', SALA_ID).then(function() {});
    
    limpiarTableroCompleto();
    actualizarUltimaBolaGrande();
    actualizarUltimasBolasChicas();
    actualizarEtapas();
    
    var btnComenzar = document.getElementById('btnComenzarPartida');
    if (btnComenzar) { btnComenzar.disabled = true; }
    var checkJ = document.getElementById('statusJugadoresCheck'); if (checkJ) checkJ.textContent = '❌';
    var cardJ = document.getElementById('statusJugadoresCard'); if (cardJ) cardJ.classList.remove('completado');
    var textoJ = document.getElementById('statusJugadoresTexto'); if (textoJ) textoJ.textContent = 'No seleccionados';
    var checkP = document.getElementById('statusPatronCheck'); if (checkP) checkP.textContent = '❌';
    var cardP = document.getElementById('statusPatronCard'); if (cardP) cardP.classList.remove('completado');
    var textoP = document.getElementById('statusPatronTexto'); if (textoP) textoP.textContent = 'No configurado';
    var btnEtapa2 = document.getElementById('btnEtapa2Mobile'); if (btnEtapa2) btnEtapa2.disabled = true;
    
    mostrarToast('🔄 Todo reiniciado', 'success');
    if (typeof navegarA === 'function') navegarA('config');
};

// ============ VERIFICAR CARTÓN ============
window.revisarCartonManual = function() {
    var idB = document.getElementById('idABuscarMobile');
    if (!idB) return;
    var id = idB.value.trim();
    if (!id) { mostrarToast('⚠️ Ingresa un ID', 'error'); return; }
    var contM = document.getElementById('minicartonMobile');
    if (contM) contM.innerHTML = '<p style="color:#94a3b8;">Buscando...</p>';
    
    supabase.from('cartones').select('*').eq('sala_id', SALA_ID).or('id.eq.' + id + ',numero.eq.' + parseInt(id)).then(function(result) {
        if (result.data && result.data.length > 0) {
            var cartonEncontrado = result.data[0];
            window.cartonActual = cartonEncontrado;
            window.cartonEnAlerta = cartonEncontrado;
            actualizarMinicartonEnAmbasVistas(cartonEncontrado);
            mostrarToast('✅ Cartón encontrado', 'success');
            
            // Mostrar alerta de bingo
            var aj = document.getElementById('alertaJugadorMobile');
            var ac = document.getElementById('alertaCartonMobile');
            var ab = document.getElementById('alertaBingoMobile');
            if (aj) aj.textContent = '👤 ' + (cartonEncontrado.asignado_a || 'Sin asignar');
            if (ac) ac.textContent = '🎫 Cartón #' + (cartonEncontrado.numero || '?');
            if (ab) ab.style.display = 'block';
        } else {
            if (contM) contM.innerHTML = '<p style="color:#ef4444;">❌ No encontrado</p>';
        }
    });
};

function actualizarMinicartonEnAmbasVistas(c) {
    if (!c || !c.carton) return;
    var html = generarHTMLMinicarton(c);
    var contM = document.getElementById('minicartonMobile');
    if (contM) contM.innerHTML = html;
}

function generarHTMLMinicarton(c) {
    if (!c || !c.carton) return '<p>Error</p>';
    var html = '<div class="minicarton-info"><span><strong>#' + (c.numero || '?') + '</strong></span><span>' + (c.asignado_a || 'Sin asignar') + '</span></div>';
    html += '<table style="width:100%;border-collapse:collapse;"><tr style="background:#ff4d4d;color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    for (var f = 0; f < 5; f++) {
        html += '<tr>';
        ['B','I','N','G','O'].forEach(function(l) {
            var v = c.carton[l][f], centro = (l === 'N' && f === 2);
            var cantado = window.cantados.indexOf(v) !== -1;
            html += '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;font-size:0.8rem;' + (centro ? 'background:#fef3c7;' : '') + (cantado && !centro ? 'background:#10b981;color:white;' : '') + '">' + (centro ? '⭐' : v) + '</td>';
        });
        html += '</tr>';
    }
    html += '</table>';
    return html;
}

window.notificarRevisionJugador = function() {
    mostrarToast('🔍 Revisando cartón', 'success');
};

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Panel iniciado - Sala:', SALA_ID);
    inicializarTablero75();
    actualizarEtapas();
    cargarPartidaDesdeSupabase();
    
    // Escuchar cambios en bingos (jugadores cantan)
    supabase.channel('bingos-' + SALA_ID)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bingos', filter: 'sala_id=eq.' + SALA_ID }, function(payload) {
            var bingo = payload.new;
            if (bingo && bingo.jugador) {
                reproducirAudioBingoManual(bingo.jugador);
                mostrarToast('🚨 ¡BINGO de ' + bingo.jugador + '!', 'error');
                var aj = document.getElementById('alertaJugadorMobile');
                var ac = document.getElementById('alertaCartonMobile');
                var ab = document.getElementById('alertaBingoMobile');
                if (aj) aj.textContent = '👤 ' + bingo.jugador;
                if (ac) ac.textContent = '🎫 Cartón ID: ' + bingo.carton_id;
                if (ab) ab.style.display = 'block';
                window.cartonEnAlerta = { asignado_a: bingo.jugador, numero: bingo.carton_id };
            }
        })
        .subscribe();
    
    // Escuchar solicitudes de chat
    supabase.channel('solicitudes-' + SALA_ID)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitudes_chat', filter: 'sala_id=eq.' + SALA_ID }, function(payload) {
            var solicitud = payload.new;
            if (solicitud) {
                var jugador = solicitud.jugador;
                var mensaje = solicitud.mensaje;
                var notificacion = document.createElement('div');
                notificacion.style.cssText = 'position:fixed;top:20px;right:20px;background:#1e293b;color:white;padding:15px 20px;border-radius:12px;z-index:500;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:2px solid #f59e0b;max-width:350px;';
                notificacion.innerHTML = '<div style="font-size:1.1em;margin-bottom:6px;">🙋 <strong>' + jugador + '</strong> pide la palabra</div><div style="font-size:0.8em;color:#94a3b8;margin-bottom:10px;">' + mensaje + '</div><div style="display:flex;gap:8px;"><button id="btnAprobar_' + Date.now() + '" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;">✅ MOSTRAR</button><button id="btnRechazar_' + Date.now() + '" style="flex:1;padding:8px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">❌ RECHAZAR</button></div>';
                document.body.appendChild(notificacion);
                var btnAprobar = notificacion.querySelector('[id^="btnAprobar"]');
                var btnRechazar = notificacion.querySelector('[id^="btnRechazar"]');
                btnAprobar.onclick = function() {
                    supabase.from('chat').insert({ sala_id: SALA_ID, mensaje: '🙋 ' + jugador + ': ' + mensaje, admin: false, jugador: jugador, timestamp: Date.now() }).then(function() {
                        notificacion.remove();
                        mostrarToast('✅ Mostrado en chat', 'success');
                    });
                };
                btnRechazar.onclick = function() { notificacion.remove(); };
                setTimeout(function() { if (notificacion.parentNode) notificacion.remove(); }, 60000);
            }
        })
        .subscribe();
});
