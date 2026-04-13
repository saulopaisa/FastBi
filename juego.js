// --- 1. ESTADO GLOBAL ---
var historialLocal = [];

// --- 2. ESCUCHAS DE FIREBASE ---
const iniciarConexiones = () => {
    db.ref('configuracion/patron').on('value', (snapshot) => {
        const patron = snapshot.val() || Array(25).fill(false);
        const grid = document.getElementById('gridPatron');
        if (!grid) return;
        grid.innerHTML = ''; 
        patron.forEach((activa, index) => {
            const celda = document.createElement('div');
            celda.className = `celda-patron ${activa ? 'activa' : ''}`;
            if (index === 12) celda.innerHTML = '<span style="opacity:0.3; font-size:10px; display:block; text-align:center;">★</span>';
            grid.appendChild(celda);
        });
    });

    db.ref('partidaActual').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data?.status === "reiniciado") { location.reload(); return; }
        if (data?.numero && !historialLocal.includes(data.numero)) {
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
    });
};

// --- 3. GENERADOR DE CARTONES (Protegido) ---
const generarCartonVisual = (idCarton) => {
    // Forzamos que el ID sea un número para que la matemática no falle
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

// --- 4. INICIALIZACIÓN (CON FIX PARA INFINITO) ---
window.onload = () => {
    iniciarConexiones();

    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get('p');
    const contenedor = document.getElementById('contenedorCartones');

    if (!contenedor) return;

    if (!p) {
        contenedor.innerHTML = "<h3>Error: No se seleccionaron cartones.</h3>";
        return;
    }

    try {
        // 1. Decodificar Base64
        const stringDecodificado = atob(p);
        // 2. Convertir a JSON
        const datos = JSON.parse(stringDecodificado);
        // 3. Asegurar que sea un Array
        const listaIds = Array.isArray(datos) ? datos : [datos];
        
        contenedor.innerHTML = ""; // <--- AQUÍ MATAMOS EL CARGANDO INFINITO

        listaIds.forEach(item => {
            // PROTECCIÓN: Si el admin mandó objetos {id, nombre}, extraemos el ID
            const idParaDibujar = (item && typeof item === 'object') ? item.id : item;
            
            const cartonHTML = generarCartonVisual(idParaDibujar);
            if (cartonHTML) {
                contenedor.appendChild(cartonHTML);
            }
        });

        // Habilitar clics
        setTimeout(() => {
            document.querySelectorAll('.bingo-table td').forEach(td => {
                if (!td.classList.contains('free-space')) {
                    td.onclick = function() { this.classList.toggle('marked'); };
                }
            });
        }, 500);

    } catch (err) {
        console.error("Fallo total:", err);
        contenedor.innerHTML = "<h3>Error crítico al generar cartones. Revisa el link.</h3>";
    }
};
