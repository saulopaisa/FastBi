// Esperamos a que todo el HTML esté cargado para evitar errores de "null"
document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btnGenerar');
    const contenedor = document.getElementById('contenedorCartones');

    if (!btnGenerar || !contenedor) {
        console.error("Error: No se encontraron los elementos necesarios en el HTML.");
        return;
    }

    // 1. CARGAR IDS DESDE EL LINK (Si vienen en Base64 o directo)
    const cargarDesdeURL = () => {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('p');
        if (!p) return;

        try {
            // Intentamos decodificar si es el formato de link largo (Base64)
            const decoded = JSON.parse(atob(p));
            const ids = Array.isArray(decoded) ? decoded : [decoded];
            ids.forEach((item, i) => {
                if (i < 4) {
                    const input = document.getElementById(`id${i + 1}`);
                    if (input) input.value = item.id || item;
                }
            });
        } catch (e) {
            // Si falla la decodificación, asumimos que es un ID simple
            const input1 = document.getElementById('id1');
            if (input1) input1.value = p;
        }
        
        // Ejecutamos el click para dibujar los cartones
        btnGenerar.click();
    };

    // 2. EVENTO DE GENERAR CARTONES
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
                localStorage.setItem(`bingo_card_id_${index}`, id);
                renderCarton(id);
            }
        });
    });

    // 3. FUNCIÓN PARA DIBUJAR EL CARTÓN
    function renderCarton(id) {
        const seed = parseInt(id) || 0;
        const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
        
        const cardData = ranges.map(range => {
            let nums = [];
            for (let i = range[0]; i <= range[1]; i++) nums.push(i);
            // Mezcla determinista para que el cartón #2 siempre sea igual
            return shuffleWithSeed([...nums], seed).slice(0, 5);
        });

        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
        let tableHtml = `
            <div class="card-id-label">JUGADOR - No. ${id.padStart(3, '0')}</div>
            <table class="bingo-table">
                <thead>
                    <tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>
                </thead>
                <tbody>
        `;

        for (let r = 0; r < 5; r++) {
            tableHtml += "<tr>";
            for (let c = 0; c < 5; c++) {
                if (r === 2 && c === 2) {
                    tableHtml += `<td class="free-space">★</td>`;
                } else {
                    const num = cardData[c][r];
                    // Recuperar si el usuario ya había marcado este número
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

    // 4. LÓGICA DE MEZCLA (SEED)
    function shuffleWithSeed(array, seed) {
        let m = array.length, t, i;
        let s = seed;
        while (m) {
            i = Math.floor(Math.abs(Math.sin(s++)) * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    // Ejecutar carga automática
    cargarDesdeURL();
});

// Función global para marcar (necesaria para el onclick del HTML generado)
function toggleMark(el, id, num) {
    el.classList.toggle('marked');
    if (el.classList.contains('marked')) {
        localStorage.setItem(`mark_${id}_${num}`, "true");
        // Efecto visual de vibración si es móvil
        if (navigator.vibrate) navigator.vibrate(50); 
    } else {
        localStorage.removeItem(`mark_${id}_${num}`);
    }
}
