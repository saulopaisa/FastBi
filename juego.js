const btnGenerar = document.getElementById('btnGenerar');
const contenedor = document.getElementById('contenedorCartones');

// Cargar IDs previos si existen
document.querySelectorAll('.setup-panel input').forEach((input, i) => {
    input.value = localStorage.getItem(`bingo_card_id_${i}`) || "";
});

btnGenerar.addEventListener('click', () => {
    const ids = [
        document.getElementById('id1').value,
        document.getElementById('id2').value,
        document.getElementById('id3').value,
        document.getElementById('id4').value
    ];

    contenedor.innerHTML = "";
    
    ids.forEach((id, index) => {
        if (id) {
            localStorage.setItem(`bingo_card_id_${index}`, id);
            renderCarton(id);
        }
    });
});

function renderCarton(id) {
    // Generador de números basado en ID (Semilla)
    const seed = parseInt(id);
    const ranges = [
        [1, 15], [16, 30], [31, 45], [46, 60], [61, 75]
    ];
    
    const cardData = ranges.map(range => {
        let nums = [];
        for (let i = range[0]; i <= range[1]; i++) nums.push(i);
        // Mezcla determinista usando la semilla
        return shuffleWithSeed(nums, seed).slice(0, 5);
    });

    // Crear HTML del cartón
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bingo-card';
    
    let tableHtml = `
        <div class="card-id-label">CARTÓN #${id.padStart(3, '0')}</div>
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
                tableHtml += `<td class="free-space">LIBRE</td>`;
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
}

function toggleMark(el, id, num) {
    el.classList.toggle('marked');
    if (el.classList.contains('marked')) {
        localStorage.setItem(`mark_${id}_${num}`, "true");
    } else {
        localStorage.removeItem(`mark_${id}_${num}`);
    }
}

// Función para que el cartón siempre tenga los mismos números según su ID
function shuffleWithSeed(array, seed) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

// Cargar automáticamente al entrar si hay IDs
if (document.getElementById('id1').value) btnGenerar.click();