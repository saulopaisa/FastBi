document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btnGenerar');
    const contenedor = document.getElementById('contenedorCartones');

    if (!btnGenerar || !contenedor) return;

    // 1. CARGAR IDS DESDE EL LINK (Base64)
    const cargarDesdeURL = () => {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('p');
        if (!p) return;
        try {
            const decoded = JSON.parse(atob(p));
            const ids = Array.isArray(decoded) ? decoded : [decoded];
            ids.forEach((item, i) => {
                if (i < 4) {
                    const input = document.getElementById(`id${i + 1}`);
                    if (input) input.value = item.id || item;
                }
            });
        } catch (e) {
            const input1 = document.getElementById('id1');
            if (input1) input1.value = p;
        }
        btnGenerar.click();
    };

    // 2. EVENTO DE GENERAR (SINCRONIZADO)
    btnGenerar.addEventListener('click', () => {
        const ids = [
            document.getElementById('id1')?.value,
            document.getElementById('id2')?.value,
            document.getElementById('id3')?.value,
            document.getElementById('id4')?.value
        ];

        contenedor.innerHTML = "";
        ids.forEach((id, index) => {
            if (id && id.trim() !== "") {
                // Guardamos el ID para persistencia
                localStorage.setItem(`bingo_card_id_${index}`, id);
                renderCarton(id);
            }
        });
    });

    // 3. FUNCIÓN DE RENDERIZADO (IGUAL A GENERAR.JS)
    function renderCarton(id) {
        const seedBase = parseInt(id);
        const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
        
        // Generar columnas exactamente como en generar.js
        const columnas = rangos.map((r, indexCol) => {
            let n = []; 
            for(let i=r[0]; i<=r[1]; i++) n.push(i);
            // Sincronización vital: ID + índice de columna
            return shuffle([...n], seedBase + indexCol).slice(0, 5);
        });

        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
        let tableHtml = `
            <div class="card-id-label">JUGADOR - No. ${id.toString().padStart(3, '0')}</div>
            <table class="bingo-table">
                <thead>
                    <tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>
                </thead>
                <tbody>
        `;

        // Construir la matriz de 5x5
        for (let r = 0; r < 5; r++) {
            tableHtml += "<tr>";
            for (let c = 0; c < 5; c++) {
                if (r === 2 && c === 2) {
                    tableHtml += `<td class="free-space">★</td>`;
                } else {
                    const num = columnas[c][r];
                    const isMarked = localStorage.getItem(`mark_${id}_${num}`) ? 'marked' : '';
                    tableHtml += `<td onclick="toggleMark(this, '${id}', ${num})" class="${isMarked}">${num}</td>`;
                }
            }
            tableHtml += "</tr>";
        }

        tableHtml += `</tbody></table>`;
        cardDiv.innerHTML = tableHtml;
        contenedor.appendChild(cardDiv);
    }

    // 4. EL SHUFFLE MATEMÁTICO (CLON DE GENERAR.JS)
    function shuffle(array, seed) {
        let m = array.length, t, i;
        while (m) {
            // El uso de seed++ aquí es lo que hace que sea determinista
            i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
            t = array[m]; 
            array[m] = array[i]; 
            array[i] = t;
        }
        return array;
    }

    cargarDesdeURL();
});

// Función de marcado manual
function toggleMark(el, id, num) {
    el.classList.toggle('marked');
    if (el.classList.contains('marked')) {
        localStorage.setItem(`mark_${id}_${num}`, "true");
        if (navigator.vibrate) navigator.vibrate(50); 
    } else {
        localStorage.removeItem(`mark_${id}_${num}`);
    }
}
