// --- 1. CONFIGURACIÓN Y ESTADO (BLINDADO) ---
// Usamos var o una comprobación para evitar el error de "Already declared"
if (typeof historialLocal === 'undefined') {
    var historialLocal = [];
}

// --- 2. FUNCIÓN DE ESCUCHA EN TIEMPO REAL ---
const iniciarEscuchaRealtime = () => {
    
    // ESCUCHA DE NÚMEROS (BOLAS)
    db.ref('partidaActual').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data?.status === "reiniciado") {
            localStorage.clear(); 
            location.reload(); 
            return;
        }
        if (data?.numero) {
            if (!historialLocal.includes(data.numero)) {
                historialLocal.push(data.numero);
                const barra = document.getElementById('barraHistorial');
                if (barra) {
                    if (historialLocal.length === 1) barra.innerHTML = '';
                    const bola = document.createElement('div');
                    bola.className = 'bola-historial';
                    bola.innerHTML = `<small>${data.letra}</small><span>${data.numero}</span>`;
                    barra.prepend(bola);
                }
            }
        }
    });

    // ESCUCHA DEL PATRÓN (DIBUJO DE LA RULETA)
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patronRuleta = snapshot.val();
        const gridGuia = document.getElementById('gridPatron');
        
        // Verificación en consola
        console.log("Sincronizando dibujo desde ruleta:", patronRuleta);

        if (!gridGuia) {
            console.warn("Aún no existe el elemento #gridPatron");
            return;
        }
        
        const datosFinales = patronRuleta || Array(25).fill(false);
        gridGuia.innerHTML = ''; 

        datosFinales.forEach((estaActiva, index) => {
            const celda = document.createElement('div');
            // IMPORTANTE: Clase 'activa' debe estar definida en tu CSS
            celda.className = `celda-patron ${estaActiva ? 'activa' : ''}`;
            
            if (index === 12) {
                celda.innerHTML = '<span style="opacity: 0.3; font-size: 10px; display: block; text-align: center;">★</span>';
            }
            gridGuia.appendChild(celda);
        });
    });
};

// --- 3. INICIALIZACIÓN ---
window.onload = () => {
    // Solo iniciamos si Firebase está listo
    if (typeof db !== 'undefined') {
        iniciarEscuchaRealtime();
    } else {
        console.error("Firebase 'db' no está definido. Revisa el orden de tus scripts.");
    }

    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    
    if (p) {
        try {
            const idsDecodificados = JSON.parse(atob(p));
            const listaIds = Array.isArray(idsDecodificados) ? idsDecodificados : [idsDecodificados];
            
            // Aquí llamarías a tu función de render:
            // renderizarCartones(listaIds); 
            
            setTimeout(habilitarMarcadoManual, 1000);
        } catch(e) {
            console.error("Error al procesar IDs:", e);
        }
    }
};

function habilitarMarcadoManual() {
    const celdas = document.querySelectorAll('.bingo-table td');
    celdas.forEach(celda => {
        celda.onclick = function() {
            this.classList.toggle('marked');
        };
    });
}
