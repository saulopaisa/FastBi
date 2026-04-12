// --- 1. ESTADO GLOBAL ---
// Usamos var para evitar errores de redifinicón si el script se carga dos veces
var historialLocal = [];

// --- 2. ESCUCHAS DE FIREBASE (Sincronización en tiempo real) ---
const iniciarConexiones = () => {
    console.log("Conexiones de Firebase iniciadas...");

    // A. Escuchar el Patrón de Victoria (Ayuda Visual)
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patron = snapshot.val() || Array(25).fill(false);
        const grid = document.getElementById('gridPatron');
        
        if (!grid) return;
        grid.innerHTML = ''; // Limpiamos el dibujo anterior

        patron.forEach((activa, index) => {
            const celda = document.createElement('div');
            // La clase 'activa' es la que brilla en amarillo (definida en el CSS del HTML)
            celda.className = `celda-patron ${activa ? 'activa' : ''}`;
            
            // Si es la celda del centro (posicion 12), ponemos la estrella
            if (index === 12) {
                celda.innerHTML = '<span style="opacity:0.3; font-size:10px; display:block; text-align:center;">★</span>';
            }
            grid.appendChild(celda);
        });
        console.log("Patrón visual actualizado desde la ruleta");
    });

    // B. Escuchar Números Cantados
    db.ref('partidaActual').on('value', (snapshot) => {
        const data = snapshot.val();
        
        // Si el admin reinicia el juego
        if (data?.status === "reiniciado") {
            localStorage.clear();
            location.reload();
            return;
        }

        // Si llega una nueva bola
        if (data?.numero) {
            if (!historialLocal.includes(data.numero)) {
                historialLocal.push(data.numero);
                
                const barra = document.getElementById('barraHistorial');
                if (barra) {
                    // Quitamos el mensaje de "Cargando..." en la primera bola
                    if (historialLocal.length === 1) barra.innerHTML = '';

                    const bola = document.createElement('div');
                    bola.className = 'bola-historial';
                    bola.innerHTML = `<small>${data.letra}</small><span>${data.numero}</span>`;
                    
                    // Salen de primero (izquierda) para que el jugador vea lo último rápido
                    barra.prepend(bola);
                }
            }
        }
    });
};

// --- 3. LÓGICA DE INTERACCIÓN DEL JUGADOR ---
const habilitarMarcadoManual = () => {
    // Buscamos todas las celdas de los cartones generados
    const celdas = document.querySelectorAll('.bingo-table td');
    
    celdas.forEach(celda => {
        // El espacio FREE no necesita ser clickeado (normalmente ya viene marcado)
        if (celda.classList.contains('free-space')) return;

        celda.onclick = function() {
            this.classList.toggle('marked'); // La clase 'marked' pone la celda amarilla
            
            // Feedback táctil para móviles
            if (navigator.vibrate) navigator.vibrate(40);
        };
    });
};

// --- 4. INICIALIZACIÓN AL CARGAR LA PÁGINA ---
window.onload = () => {
    // Iniciamos Firebase
    iniciarConexiones();

    // Leemos los parámetros de la URL (donde vienen los IDs de los cartones)
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');

    if (p) {
        try {
            // El parámetro 'p' suele ser un JSON en Base64
            const datosDecodificados = JSON.parse(atob(p));
            const listaIds = Array.isArray(datosDecodificados) ? datosDecodificados : [datosDecodificados];
            
            console.log("Cargando cartones con IDs:", listaIds);

            /* NOTA: Aquí es donde llamarías a tu función que DIBUJA los cartones 
               en el div #contenedorCartones usando los IDs.
            */

            // Esperamos un segundo a que se dibujen los cartones y activamos los clicks
            setTimeout(habilitarMarcadoManual, 1000);

        } catch (e) {
            console.error("Error al procesar los IDs de los cartones:", e);
        }
    }
};
// --- 3. GENERADOR DE CARTONES (Sincronizado con el Admin) ---
const generarCartonVisual = (idCarton) => {
    
    // 1. LAS MISMAS FUNCIONES MATEMÁTICAS DEL ADMIN
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
        const seedBase = parseInt(id);
        const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
        const columnas = rangos.map((r, indexCol) => {
            let n = []; 
            for(let i=r[0]; i<=r[1]; i++) n.push(i);
            return shufflePlayer([...n], (seedBase * 10) + indexCol).slice(0, 5);
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

    // 2. OBTENEMOS LOS NÚMEROS EXACTOS
    const matrizNumeros = generarMatrizPlayer(idCarton);

    // 3. CONSTRUIMOS EL HTML DEL CARTÓN
    const card = document.createElement('div');
    card.className = 'bingo-card';
    
    const label = document.createElement('div');
    label.className = 'card-id-label';
    label.innerText = `CARTÓN N° ${idCarton}`;
    card.appendChild(label);

    const table = document.createElement('table');
    table.className = 'bingo-table';
    table.innerHTML = `<thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead>`;
    
    const tbody = document.createElement('tbody');
    matrizNumeros.forEach((filaFisica, r) => {
        const tr = document.createElement('tr');
        filaFisica.forEach((numero, c) => {
            const td = document.createElement('td');
            if (numero === 'FREE') {
                td.className = 'free-space marked';
                td.innerText = '★';
            } else {
                td.innerText = numero;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    return card;
};

