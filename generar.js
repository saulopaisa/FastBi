// generar.js - Versión simplificada para debug

const SALA_ID = localStorage.getItem('salaActiva') || 'sala-' + Date.now().toString(36);
localStorage.setItem('salaActiva', SALA_ID);

console.log('📁 Sala:', SALA_ID);
console.log('📁 Ruta:', 'salas/' + SALA_ID + '/cartones');

// Generar columna
function generarColumna(min, max) {
    const nums = [];
    while (nums.length < 5) {
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(n)) nums.push(n);
    }
    nums.sort((a, b) => a - b);
    return nums;
}

// Generar cartón
function generarCarton() {
    const c = {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75)
    };
    c.N[2] = 'FREE';
    return c;
}

// GENERAR LOTE
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    console.log('🎲 INICIO generacion de ' + cantidad + ' cartones');
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'c' + Date.now() + 'i' + i + 'r' + Math.floor(Math.random() * 10000);
        const carton = generarCarton();
        
        const datos = {
            id: id,
            numero: i + 1,
            nombre: 'Cartón ' + (i + 1),
            carton: carton,
            estado: 'disponible',
            asignadoA: '',
            creado: Date.now()
        };
        
        console.log('📝 Guardando cartón ' + (i+1) + ' con ID:', id);
        
        db.ref('salas/' + SALA_ID + '/cartones/' + id).set(datos)
            .then(() => {
                console.log('✅ Guardado: cartón ' + (i+1));
            })
            .catch(err => {
                console.error('❌ Error guardando cartón ' + (i+1) + ':', err);
            });
    }
    
    input.value = '';
    console.log('🏁 FIN generacion');
}

// SINCRONIZACIÓN - Escuchar cambios
function iniciarSync() {
    console.log('👂 Escuchando cambios en Firebase...');
    
    db.ref('salas/' + SALA_ID + '/cartones').on('value', function(snap) {
        console.log('📡 Datos recibidos. Total hijos:', snap.numChildren());
        
        const total = snap.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones</p>';
            return;
        }
        
        // Limpiar contenedor
        contenedor.innerHTML = '';
        
        // Recorrer todos los cartones
        snap.forEach(function(child) {
            const c = child.val();
            console.log('  📋 Cartón encontrado: #' + c.numero + ' - ' + c.nombre);
            
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', c.id);
            div.style.cssText = 'background:white; color:#1e293b; border-radius:8px; padding:12px; margin-bottom:8px; border-left:5px solid #3b82f6;';
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT') return;
                verPreview(c.id);
            };
            
            div.innerHTML = 
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">' +
                '<strong># ' + c.numero + '</strong>' +
                '<span style="font-size:0.7rem; background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px;">' + (c.estado || 'disponible') + '</span>' +
                '</div>' +
                '<input type="text" value="' + (c.nombre || '') + '" style="width:100%; padding:5px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:5px;" ' +
                'onchange="renombrar(\'' + c.id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div style="display:flex; gap:4px;">' +
                '<button onclick="event.stopPropagation(); copiarLink(\'' + c.id + '\')" style="flex:1; padding:4px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.7rem;">🔗</button>' +
                '<button onclick="event.stopPropagation(); eliminar(\'' + c.id + '\')" style="flex:1; padding:4px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.7rem;">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
        
        console.log('✅ Lista actualizada con ' + total + ' cartones');
    });
}

// Vista previa
function verPreview(id) {
    console.log('👁️ Ver cartón:', id);
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value').then(snap => {
        const d = snap.val();
        if (d && d.carton) {
            let html = '<div style="padding:20px;">';
            html += '<h2>Cartón #' + d.numero + '</h2>';
            html += '<table style="width:100%; border-collapse:collapse; max-width:300px; margin:15px auto;">';
            html += '<tr style="background:#ff4d4d; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
            
            for (let f = 0; f < 5; f++) {
                html += '<tr>';
                ['B','I','N','G','O'].forEach(l => {
                    const v = d.carton[l][f];
                    const esCentro = (l === 'N' && f === 2);
                    html += '<td style="padding:8px; border:1px solid #e2e8f0; text-align:center;';
                    if (esCentro) html += 'background:#fef3c7;';
                    html += '">' + (esCentro ? '⭐' : v) + '</td>';
                });
                html += '</tr>';
            }
            
            html += '</table></div>';
            preview.innerHTML = html;
        }
    });
}

// Funciones auxiliares
function renombrar(id, nombre) {
    if (nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

function copiarLink(id) {
    const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + id + '&sala=' + SALA_ID;
    navigator.clipboard.writeText(link).then(() => alert('Link copiado'));
}

function eliminar(id) {
    if (confirm('Eliminar?')) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).remove();
    }
}

function borrarTodo() {
    if (confirm('ELIMINAR TODO?')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove();
    }
}

function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        const data = { sala: SALA_ID, cartones: snap.val() };
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones.json';
        a.click();
    });
}

function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const data = JSON.parse(ev.target.result);
        if (data.cartones) {
            db.ref('salas/' + SALA_ID + '/cartones').set(data.cartones);
        }
    };
    reader.readAsText(file);
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(snap => {
        let html = '<h2>LINKS</h2>';
        snap.forEach(child => {
            const c = child.val();
            const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0;">#' + c.numero + '<br><input value="' + link + '" style="width:100%;" onclick="this.select()"></div>';
        });
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    document.querySelectorAll('.card-carton').forEach(c => c.classList.toggle('seleccionado'));
}

function filtrarCartones(t) {
    const f = t.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(f) ? '' : 'none';
    });
}

// INICIAR
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 INICIANDO APP');
    
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', function() {
        alert('PDF en desarrollo');
    });
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnSelTodos').addEventListener('click', seleccionarTodos);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() {
        location.href = 'ruleta.html';
    });
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    
    // Iniciar sincronización
    iniciarSync();
});
