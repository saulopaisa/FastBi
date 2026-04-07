const container = document.getElementById('bingo-container');
const btn = document.getElementById('generateBtn');
const counterDisplay = document.getElementById('counter');
let displayedCards = 0;

// Cargar marcas guardadas del navegador
let markedCells = JSON.parse(localStorage.getItem('bingo_marks')) || {};

btn.addEventListener('click', () => {
    if (displayedCards < 300) {
        const cardData = BINGO_DATA[displayedCards];
        renderCard(cardData);
        displayedCards++;
        counterDisplay.innerText = displayedCards;
    }
});

function renderCard(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bingo-card';
    cardDiv.dataset.id = card.id;
    
    let html = `
        <div class="card-id">№ ${card.id.toString().padStart(3, '0')}</div>
        <div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
        <div class="bingo-grid">`;

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const val = card.matrix[col][row];
            const isFree = val === "FREE";
            const cellId = `${card.id}-${row}-${col}`;
            const isMarked = markedCells[cellId] ? 'marked' : '';

            html += `
                <div class="cell ${isFree ? 'free-space' : ''} ${isMarked}" 
                     onclick="toggleMark('${cellId}', this)">
                    ${isFree ? '⭐' : val}
                </div>`;
        }
    }

    html += `</div>`;
    cardDiv.innerHTML = html;
    container.appendChild(cardDiv);
}

function toggleMark(id, element) {
    element.classList.toggle('marked');
    if (element.classList.contains('marked')) {
        markedCells[id] = true;
    } else {
        delete markedCells[id];
    }
    // Guardar en la "base de datos" del navegador
    localStorage.setItem('bingo_marks', JSON.stringify(markedCells));
}