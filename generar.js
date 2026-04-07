    let baseDatos = JSON.parse(localStorage.getItem('bingo_cartones')) || [];
    let seleccionados = [];

    function renderizarLista(filtro = "") {
        const contenedor = document.getElementById('contenedorLista');
        const contador = document.getElementById('countDisplay');
        contenedor.innerHTML = "";
        contador.innerText = baseDatos.length;

        const datosFiltrados = baseDatos.filter(item => 
            item.apodo.toLowerCase().includes(filtro.toLowerCase()) || 
            item.id.toString().includes(filtro)
        );

        datosFiltrados.forEach((item) => {
            const originalIndex = baseDatos.findIndex(orig => orig.id === item.id);
            const estaSeleccionado = seleccionados.some(s => s.id === item.id);
            
            const card = document.createElement('div');
            card.className = `id-card ${estaSeleccionado ? 'selected' : ''}`;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 0.7rem; color: var(--accent-red); font-weight: 900;">ID #${item.id}</span>
                    <input type="checkbox" ${estaSeleccionado ? 'checked' : ''} 
                           onclick="event.stopPropagation(); alternarSeleccion(${item.id}, '${item.apodo}')" 
                           style="transform: scale(1.4); cursor:pointer;">
                </div>
                <input type="text" value="${item.apodo}" 
                       style="border: 1px solid #ddd; padding: 6px; border-radius: 4px; font-weight: bold; width:100%; box-sizing:border-box;"
                       oninput="actualizarApodo(${originalIndex}, this.value)"
                       onclick="event.stopPropagation()">
            `;
            card.onclick = () => verCarton(item.id, item.apodo);
            contenedor.appendChild(card);
        });
        localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
    }

    function actualizarPanelSeleccion() {
    const panel = document.getElementById('seleccion-maestra');
    const lista = document.getElementById('listaSeleccionados');
    const count = document.getElementById('countSeleccion');
    
    if (seleccionados.length > 0) {
        panel.style.display = "block"; // Aparece la barra flotante
        count.innerText = seleccionados.length;
        
        // Mostramos burbujas pequeñas con el ID para ahorrar espacio
        lista.innerHTML = seleccionados.map(s => 
            `<span style="background:rgba(255,255,255,0.1); color:#25d366; padding:2px 6px; border-radius:4px; font-size:0.7rem; border: 1px solid #25d366;">#${s.id}</span>`
        ).join("");
    } else {
        panel.style.display = "none"; // Desaparece si no hay nada
    }
}

// Nueva función para limpiar la selección rápidamente
function cancelarSeleccion() {
    seleccionados = [];
    actualizarPanelSeleccion();
    renderizarLista(document.getElementById('buscador').value);
}

// Modificamos generarLinkMultiple para que limpie después de copiar
function generarLinkMultiple() {
    if (seleccionados.length === 0) return;
    
    const pack = btoa(JSON.stringify(seleccionados));
    const fullUrl = `${window.location.origin}${window.location.pathname.replace('generar.html', 'juego.html')}?p=${pack}`;
    
    navigator.clipboard.writeText(fullUrl).then(() => {
        alert("¡Link múltiple copiado!");
        cancelarSeleccion(); // Limpia la barra automáticamente
    });
}

    function alternarSeleccion(id, nombre) {
        const index = seleccionados.findIndex(s => s.id === id);
        if (index > -1) {
            seleccionados.splice(index, 1);
        } else {
            if (seleccionados.length >= 4) {
                alert("Límite máximo: 4 cartones por link");
                renderizarLista(document.getElementById('buscador').value);
                return;
            }
            seleccionados.push({ id, nombre });
        }
        actualizarPanelSeleccion();
        renderizarLista(document.getElementById('buscador').value);
    }

    function actualizarPanelSeleccion() {
        const panel = document.getElementById('seleccion-maestra');
        const lista = document.getElementById('listaSeleccionados');
        const count = document.getElementById('countSeleccion');
        
        if (seleccionados.length > 0) {
            panel.style.display = "block";
            count.innerText = seleccionados.length;
            lista.innerHTML = seleccionados.map(s => 
                `<span style="background:#25d366; color:white; padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:bold;">#${s.id}</span>`
            ).join("");
        } else {
            panel.style.display = "none";
        }
    }

    function generarLinkMultiple() {
        if (seleccionados.length === 0) return;
        const pack = btoa(JSON.stringify(seleccionados));
        // Ajustado para apuntar a juego.html
        const fullUrl = `${window.location.origin}${window.location.pathname.replace('generar.html', 'juego.html')}?p=${pack}`;
        copiarLink(fullUrl);
    }

    function copiarLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            alert("¡Link de WhatsApp copiado con éxito!");
        }).catch(() => {
            prompt("Copia el link manualmente:", url);
        });
    }

    document.getElementById('btnGenerar').onclick = () => {
        const cant = parseInt(document.getElementById('inputCantidad').value);
        if(!cant || cant < 1) return;
        const ultimoId = baseDatos.length > 0 ? Math.max(...baseDatos.map(o => o.id)) : 0;
        for(let i=1; i<=cant; i++) {
            baseDatos.push({ id: ultimoId + i, apodo: `Jugador ${ultimoId + i}` });
        }
        renderizarLista();
    };

    function actualizarApodo(index, valor) {
        baseDatos[index].apodo = valor;
        localStorage.setItem('bingo_cartones', JSON.stringify(baseDatos));
    }

    function verCarton(id, apodo) {
        document.getElementById('placeholderVisor').style.display = "none";
        document.getElementById('visorDetallado').style.display = "flex";
        document.getElementById('nombreVisor').innerText = apodo;
        document.getElementById('idVisor').innerText = "ID REGISTRADO: #" + id;
        
        const matriz = generarMatriz(id);
        const tabla = document.getElementById('tablaVisor');
        let html = `<tr style="background:var(--primary-blue); color:white; font-weight:900;"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>`;
        matriz.forEach(fila => {
            html += `<tr>`;
            fila.forEach(c => html += `<td>${c === 'FREE' ? '★' : c}</td>`);
            html += `</tr>`;
        });
        tabla.innerHTML = html;
    }

    function generarMatriz(id) {
        const seedBase = parseInt(id);
        const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
        const columnas = rangos.map(r => {
            let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
            return shuffle(n, seedBase).slice(0, 5);
        });
        let m = [];
        for(let r=0; r<5; r++) {
            let fila = [];
            for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
            m.push(fila);
        }
        return m;
    }

    function shuffle(array, seed) {
        let m = array.length, t, i;
        while (m) {
            i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
            t = array[m]; array[m] = array[i]; array[i] = t;
        }
        return array;
    }

    function importarData(event) {
        const reader = new FileReader();
        reader.onload = (e) => {
            baseDatos = JSON.parse(e.target.result);
            renderizarLista();
        };
        reader.readAsText(event.target.files[0]);
    }

    function exportarData() {
        const blob = new Blob([JSON.stringify(baseDatos)], {type: "application/json"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "cartones_bingo.json";
        a.click();
    }

    function limpiarTodo() { if(confirm("¿Borrar todo?")) { baseDatos = []; seleccionados = []; renderizarLista(); location.reload(); } }

    document.getElementById('buscador').oninput = (e) => renderizarLista(e.target.value);
    renderizarLista();
