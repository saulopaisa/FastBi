document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btnGenerar');
    const contenedor = document.getElementById('contenedorCartones');

    if (!btnGenerar || !contenedor) return;

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

    function renderCarton(id) {
        // Usamos una semilla simple para la generación inicial
        let seed = parseInt(id) || 0;
        const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
        
        const cardData = ranges.map(range => {
            let nums = [];
            for (let i = range[0]; i <= range[1]; i++) nums.push(i);
            return shuffleWithSeed([...nums], seed).slice(0, 5);
        });

        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        cardDiv.id = `card-${id}`; // ID para encontrarlo luego
        
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
                    const isMarked = localStorage.getItem(`mark_${id}_${num}`) ? 'marked' : '';
                    tableHtml += `<td onclick="toggleMark(this, '${id}', ${num})" class="${isMarked}">${num}</td>`;
                }
            }
            tableHtml += "</tr>";
        }

        tableHtml += `</tbody></table>`;
        cardDiv.innerHTML = tableHtml;
        contenedor.appendChild(cardDiv);

        // --- CLAVE: Intentar sincronizar con la DB del tablero ---
        sincronizarConDB(id, cardDiv);
    }

    // Lógica de mezcla determinista (Asegúrate que el tablero use la misma)
    function shuffleWithSeed(array, seed) {
        let m = array.length, t, i;
        while (m) {
            seed = (seed * 9301 + 49297) % 233280;
            let rnd = seed / 233280;
            i = Math.floor(rnd * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    // Si el tablero guarda los cartones en Firebase, esto los traerá exactos
    function sincronizarConDB(id, elemento) {
        if (typeof firebase !== 'undefined') {
            const db = firebase.database();
            db.ref(`cartonesRegistrados/${id}`).once('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.numeros) {
                    const celdas = elemento.querySelectorAll('td:not(.free-space)');
                    data.numeros.forEach((num, i) => {
                        if (celdas[i]) {
                            celdas[i].innerText = num;
                            // Actualizar el onclick con el número correcto de la DB
                            celdas[i].setAttribute('onclick', `toggleMark(this, '${id}', ${num})`);
                            // Re-chequear si estaba marcado el número de la DB
                            if (localStorage.getItem(`mark_${id}_${num}`)) {
                                celdas[i].classList.add('marked');
                            } else {
                                celdas[i].classList.remove('marked');
                            }
                        }
                    });
                }
            });
        }
    }

    cargarDesdeURL();
});

function toggleMark(el, id, num) {
    el.classList.toggle('marked');
    if (el.classList.contains('marked')) {
        localStorage.setItem(`mark_${id}_${num}`, "true");
        if (navigator.vibrate) navigator.vibrate(50); 
    } else {
        localStorage.removeItem(`mark_${id}_${num}`);
    }
}
