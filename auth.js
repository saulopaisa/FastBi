// auth.js - Protección con contraseña
(function() {
    // Solo proteger si NO es jugador.html
    const esJugador = window.location.pathname.includes('jugador.html');
    if (esJugador) return; // Los jugadores no necesitan contraseña
    
    const PASSWORD = 'bingo2024'; // CAMBIA ESTA CONTRASEÑA
    
    if (sessionStorage.getItem('bingo_auth') === 'true') return;
    
    const intentos = parseInt(sessionStorage.getItem('bingo_intentos') || '0');
    
    if (intentos >= 3) {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;font-size:1.5rem;background:#0b0f1a;height:100vh;display:flex;align-items:center;justify-content:center;">🔒 Demasiados intentos. Recarga la página.</div>';
        return;
    }
    
    const password = prompt('🔐 Contraseña de administrador:');
    
    if (password !== PASSWORD) {
        sessionStorage.setItem('bingo_intentos', (intentos + 1).toString());
        alert('❌ Contraseña incorrecta. Intento ' + (intentos + 1) + ' de 3');
        window.location.reload();
    } else {
        sessionStorage.setItem('bingo_auth', 'true');
        sessionStorage.removeItem('bingo_intentos');
        alert('✅ Acceso concedido');
    }
})();
