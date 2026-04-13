// --- 1. ESTADO GLOBAL ---
var historialLocal = [];

// --- 2. ESCUCHAS DE FIREBASE (Sincronización en tiempo real) ---
const iniciarConexiones = () => {
    console.log("Conexiones de Firebase iniciadas...");

    // A. Escuchar el Patrón de Victoria (Dibujo guía)
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patron = snapshot.val() || Array(25).fill(false);
        const grid = document.getElementById('gridPatron');
        if (!grid) return;
        grid.innerHTML = ''; 

        patron.forEach((activa, index) => {
            const celda = document.createElement('div');
            celda.className = `celda-patron ${activa ? 'activa' : ''}`;
            if (index === 12) {
                celda.innerHTML = '<span style="opacity:0.3; font-size:10px; display:block; text-align:center;">★</span>';
            }
            grid.appendChild(celda);
        });
    });

    // B. Escuchar Números Cantados y Estado del Juego
    db.ref('partidaActual').on('value', (snapshot) => {
        const data = snapshot.val();
        
        // CORRECCIÓN: Si el admin reinicia, limpiamos la interfaz sin recargar la página
        if (data?.status === "reiniciado") {
            console.log("Reinicio detectado: Limpiando tablero...");
            historialLocal = [];
            const barra = document.getElementById('barraHistorial');
            if (barra) {
                barra.innerHTML = '<div style="color: #64748b; font-size: 0.7rem;">Juego reiniciado. Esperando números...</div>';
            }
            // Desmarcar todas las celdas (excepto el centro FREE)
            document.querySelectorAll('.bingo-table td').forEach(td => {
                if (!td.classList.contains('free-space')) {
                    td.classList.remove('marked');
                }
            });
            return; 
        }

        // Si llega una nueva bola
        if (data?.numero) {
            if (!historialLocal.includes(data.numero)) {
                historialLocal.push(data.numero);
                const barra = document.getElementById('barraHistorial');
                if (barra) {
                    if (historialLocal.length === 1) barra.innerHTML = '';
                    const bola = document.createElement('div');
                    bola.className = 'bola-historial';
                    bola.innerHTML = `<small>${data.letra}</small><span>${data.numero}</span>`;
                    // Las nuevas bolas aparecen al principio de la barra
                    barra.prepend(bola);
                }
            }
        }
    });
};

// --- 3. GENERADOR DE CARTONES (Lógica determinista) ---
const generarCartonVisual = (idCarton) => {
    const idLimpio = parseInt(idCarton);
    if (isNaN(idLimpio)) return null;

    const shufflePlayer = (array, seed) => {
        let m = array.length, t, i;
        let localSeed = seed;
        while (m) {
            let x = Math.sin(localSeed++) * 10000;
            let randomDecimal = x - Math.floor(x);
            i = Math.floor(randomDecimal * m--);
            t = array[m]; array[m] = array[i]; array[i] = t;
        }
        return array;
    };

    const generarMatrizPlayer = (id) => {
        const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
        const columnas = rangos.map((r, indexCol) => {
            let n = []; 
            for(let i=r[0]; i<=r[1]; i++) n.push(i);
            return shufflePlayer([...n], (id * 10) + indexCol).slice(0, 5);
        });

        let m = [];
        for(let r=0; r<5; r++) {
            let fila = [];
            for(let c=0; c<5; c++) {
                fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
            }
            m.push(fila);
        }
        return m;
    };

    const matrizNumeros = generarMatrizPlayer(idLimpio);
    const card = document.createElement('div');
    card.className = 'bingo-card';
    card.innerHTML = `<div class="card-id-label">CARTÓN N° ${idLimpio}</div>`;
    
    const table = document.createElement('table');
    table.className = 'bingo-table';
    let html = '<thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>';
    
    matrizNumeros.forEach(fila => {
        html += '<tr>';
        fila.forEach(n => {
            if(n === 'FREE') html += '<td class="free-space marked">★</td>';
            else html += `<td>${n}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    card.appendChild(table);
    return card;
};

// --- 4. INTERACCIÓN DE MARCADO ---
const habilitarMarcadoManual = () => {
    const celdas = document.querySelectorAll('.bingo-table td');
    celdas.forEach(celda => {
        if (celda.classList.contains('free-space')) return;
        celda.onclick = function() {
            this.classList.toggle('marked');
            if (navigator.vibrate) navigator.vibrate(40);
        };
    });
};

// --- 5. INICIALIZACIÓN ---
window.onload = () => {
    iniciarConexiones();

    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const contenedor = document.getElementById('contenedorCartones');

    if (!contenedor) return;

    if (p) {
        try {
            // Decodificación ultra-segura para manejar acentos y caracteres especiales
            const decodedBase64 = atob(p);
            const decodedJson = decodeURIComponent(escape(decodedBase64));
            const datos = JSON.parse(decodedJson);
            
            const listaIds = Array.isArray(datos) ? datos : [datos];
            
            // Limpiar el mensaje de "Cargando"
            contenedor.innerHTML = ""; 

            listaIds.forEach(item => {
                // Soporta tanto si el admin envía solo IDs como si envía objetos {id, nombre}
                const idParaDibujar = (item && typeof item === 'object') ? item.id : item;
                const nuevoCarton = generarCartonVisual(idParaDibujar);
                if (nuevoCarton) {
                    contenedor.appendChild(nuevoCarton);
                }
            });

            // Activar la funcionalidad de click en las celdas
            setTimeout(habilitarMarcadoManual, 300);

        } catch (e) {
            console.error("Error al procesar el link:", e);
            contenedor.innerHTML = "<div style='color:white; text-align:center;'><h3>Error en el link</h3><p>El formato es incorrecto o está incompleto.</p></div>";
        }
    } else {
        contenedor.innerHTML = "<div style='color:white; text-align:center;'><h3>Esperando cartones</h3><p>Por favor, abre el link que te enviaron.</p></div>";
    }
};
