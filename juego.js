// --- 1. CONFIGURACIÓN Y ESTADO ---
let historialLocal = [];

// Usamos una función para encapsular la escucha y asegurar que el DOM esté listo
const iniciarEscuchaRealtime = () => {
    
    // --- 2. ESCUCHA DE NÚMEROS ---
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

    // --- 3. ESCUCHA DEL PATRÓN (EL "DIBUJO" DE LA RULETA) ---
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patronRuleta = snapshot.val();
        const gridGuia = document.getElementById('gridPatron');
        
        // LOG DE DEPURACIÓN: Abre la consola (F12) y mira si llega esto
        console.log("Datos recibidos de Firebase:", patronRuleta);

        if (!gridGuia) {
            console.error("ERROR: No se encontró el elemento #gridPatron en el HTML");
            return;
        }
        
        // Si no hay datos, creamos un array vacío de 25
        const datosFinales = patronRuleta || Array(25).fill(false);
        
        gridGuia.innerHTML = ''; 

        datosFinales.forEach((estaActiva, index) => {
            const celda = document.createElement('div');
            // IMPORTANTE: Asegúrate que el CSS tenga .celda-patron y .activa
            celda.className = `celda-patron ${estaActiva ? 'activa' : ''}`;
            
            if (index === 12) {
                celda.innerHTML = '<span style="opacity: 0.3; font-size: 10px; display: block; text-align: center;">★</span>';
            }
            gridGuia.appendChild(celda);
        });
    });
};

// --- 4. MODIFICACIÓN EN WINDOW.ONLOAD ---
window.onload = () => {
    // Iniciamos la escucha de Firebase SOLO cuando la ventana cargó todo el HTML
    iniciarEscuchaRealtime();

    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    
    if (p) {
        try {
            const idsDecodificados = JSON.parse(atob(p));
            const listaIds = Array.isArray(idsDecodificados) ? idsDecodificados : [idsDecodificados];
            
            // Aquí debe ir tu función que crea los cartones:
            // renderizarMisCartones(listaIds); 
            
            setTimeout(habilitarMarcadoManual, 1000);
        } catch(e) {
            console.error("Error al cargar IDs:", e);
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
