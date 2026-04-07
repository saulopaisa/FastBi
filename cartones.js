// Semilla fija: Puedes cambiar este número por cualquier otro. 
// Mientras sea el mismo, los 300 cartones serán siempre los mismos.
const SEED = 12345; 
let currentSeed = SEED;

// Función para generar números pseudo-aleatorios basados en la semilla
function seededRandom() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
}

const BINGO_DATA = [];

function preGenerarTodo() {
    for (let i = 1; i <= 300; i++) {
        const card = {
            id: i,
            matrix: generateMatrix()
        };
        BINGO_DATA.push(card);
    }
}

function generateMatrix() {
    const ranges = [
        { min: 1, max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 },
        { min: 46, max: 60 }, { min: 61, max: 75 }
    ];

    return ranges.map((range, index) => {
        let col = [];
        while (col.length < 5) {
            // USAMOS seededRandom() en lugar de Math.random()
            let num = Math.floor(seededRandom() * (range.max - range.min + 1)) + range.min;
            if (!col.includes(num)) col.push(num);
        }
        col.sort((a, b) => a - b);
        if (index === 2) col[2] = "FREE"; 
        return col;
    });
}

// Ejecutamos la generación
preGenerarTodo();