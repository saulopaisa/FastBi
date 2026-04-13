// --- 1. ESTADO GLOBAL ---
var historialLocal = [];

// --- 2. ESCUCHAS DE FIREBASE ---
const iniciarConexiones = () => {
    console.log("Conexiones de Firebase iniciadas...");

    // A. Escuchar el Patrón de Victoria
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

    // B. Escuchar Números Cantados
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
};

// --- 3. GENERADOR DE CARTONES (Sincronizado con Admin) ---
const generarCartonVisual = (idCarton) => {
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

    const matrizNumeros = generarMatrizPlayer(idCarton);
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
    matrizNumeros.forEach((filaFisica) => {
        const tr = document.createElement('tr');
        filaFisica.forEach((numero) => {
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

// --- 4. INTERACCIÓN ---
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

// --- 5. INICIALIZACIÓN (LA CORRECCIÓN ESTÁ AQUÍ) ---
window.onload = () => {
    iniciarConexiones();

    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const contenedor = document.getElementById('contenedorCartones');

    if (p && contenedor) {
        try {
            const datosDecodificados = JSON.parse(atob(p));
            const listaIds = Array.isArray(datosDecodificados) ? datosDecodificados : [datosDecodificados];
            
            contenedor.innerHTML = ""; // Limpiar el "Cargando..."

            listaIds.forEach(item => {
                // Si el item es un objeto {id, nombre}, usamos item.id. Si es solo un número, lo usamos directo.
                const idReal = (typeof item === 'object') ? item.id : item;
                const nuevoCarton = generarCartonVisual(idReal);
                contenedor.appendChild(nuevoCarton);
            });

            // Activamos los clicks
            setTimeout(habilitarMarcadoManual, 500);

        } catch (e) {
            console.error("Error al decodificar:", e);
            contenedor.innerHTML = "Error al cargar los cartones.";
        }
    }
};
