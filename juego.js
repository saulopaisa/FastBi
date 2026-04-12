// --- 1. CONFIGURACIÓN Y ESTADO ---
// El objeto 'db' debe estar inicializado en tu HTML con firebase.database()
let historialLocal = [];

// --- 2. ESCUCHA DE NÚMEROS (BARRA SUPERIOR) ---
db.ref('partidaActual').on('value', (snapshot) => {
    const data = snapshot.val();
    
    // Si el admin reinicia la partida
    if (data?.status === "reiniciado") {
        localStorage.clear(); 
        location.reload(); 
        return;
    }

    // Si llega un número nuevo
    if (data?.numero) {
        if (!historialLocal.includes(data.numero)) {
            historialLocal.push(data.numero);
            
            const barra = document.getElementById('barraHistorial');
            // Limpiar mensaje de "Cargando..." en la primera bola
            if (historialLocal.length === 1) barra.innerHTML = '';

            // Crear la bolita visual
            const bola = document.createElement('div');
            bola.className = 'bola-historial';
            bola.innerHTML = `<small>${data.letra}</small><span>${data.numero}</span>`;
            
            // Insertar al principio para que lo más nuevo se vea primero
            barra.prepend(bola);
        }
    }
});

// --- 3. ESCUCHA DEL PATRÓN (AYUDA VISUAL) ---
db.ref('configuracion/patron').on('value', (snapshot) => {
    const patronRuleta = snapshot.val() || Array(25).fill(false);
    const gridGuia = document.getElementById('gridPatron');
    
    if (!gridGuia) return; // Seguridad por si el elemento no existe
    
    gridGuia.innerHTML = ''; // Limpiar dibujo anterior

    patronRuleta.forEach((estaActiva, index) => {
        const celda = document.createElement('div');
        
        // Aplicamos la clase 'activa' si el admin lo marcó en la ruleta
        celda.className = `celda-patron ${estaActiva ? 'activa' : ''}`;
        
        // El centro siempre lleva una marca visual (Estrella)
        if (index === 12) {
            celda.innerHTML = '<span style="opacity: 0.3; font-size: 10px; display: block; text-align: center;">★</span>';
        }
        
        gridGuia.appendChild(celda);
    });
    
    console.log("Forma de ganar actualizada");
});

// --- 4. LÓGICA DE MARCADO MANUAL DEL JUGADOR ---
// Esta función debe llamarse cuando se generan los cartones en el DOM
function habilitarMarcadoManual() {
    const celdas = document.querySelectorAll('.bingo-table td');
    
    celdas.forEach(celda => {
        // Evitar marcar el espacio FREE si ya está marcado
        if (celda.classList.contains('free-space')) return;

        celda.onclick = function() {
            this.classList.toggle('marked');
            // Opcional: Sonido de click o vibración
            if (navigator.vibrate) navigator.vibrate(50);
        };
    });
}

// --- 5. INICIALIZACIÓN POR URL (ID DE CARTONES) ---
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    
    if (p) {
        try {
            // Intentar decodificar si viene en Base64 o usar directo
            const idsDecodificados = JSON.parse(atob(p));
            const listaIds = Array.isArray(idsDecodificados) ? idsDecodificados : [idsDecodificados];
            
            // Aquí llamarías a tu función que genera los cartones visuales usando los IDs
            // Ejemplo: listaIds.forEach(id => generarCartonVisual(id));
            
            // Importante: Habilitar el click después de crear los cartones
            setTimeout(habilitarMarcadoManual, 500);
            
        } catch(e) {
            console.error("Error al cargar IDs:", e);
        }
    }
};
