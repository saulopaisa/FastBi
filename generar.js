// generar.js - Versión final simplificada

const SALA_ID = localStorage.getItem('salaActiva') || 'sala-' + Date.now().toString(36);
localStorage.setItem('salaActiva', SALA_ID);

// ============ GENERAR COLUMNA ============
function generarColumna(min, max) {
    const nums = [];
    while (nums.length < 5) {
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
}

// ============ GENERAR CARTÓN ============
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

// ============ MOSTRAR LISTA MANUALMENTE ============
function mostrarLista() {
    console.log('🔄 Actualizando lista...');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        console.log('📦 Cartones en Firebase: ' + total);
        
        // Actualizar contador
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        // Actualizar lista
        const contenedor = document.getElementById('listaCartones');
        contenedor.innerHTML = '';
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados aún</p>';
            return;
        }
        
        const cartones = [];
        snap.forEach(function(child) {
            cartones.push({ key: child.key, data: child.val() });
        });
        
        // Ordenar por número
        cartones.sort(function(a, b) {
            return (a.data.numero || 0) - (b.data.numero || 0);
        });
        
        // Crear cards
        cartones.forEach(function(item) {
            const c = item.data;
            const id = item.key;
            
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', id);
            div.style.cssText = 'background:white; color:#1e293b; border-radius:8px; padding:12px; margin-bottom:8px; border-left:5px solid #3b82f6; cursor:pointer;';
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verPreview(id);
            };
            
            div.innerHTML = 
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<strong style="font-size:0.9rem;"># ' + (c.numero || '?') + '</strong>' +
                '<span style="font-size:0.65rem; background:#dcfce7; color:#166534; padding:2px 8px; border-radius:12px;">' + (c.estado || 'disponible') + '</span>' +
                '</div>' +
                (c.asignadoA ? '<div style="font-size:0.7rem; color:#10b981; margin-bottom:4px;">👤 ' + c.asignadoA + '</div>' : '') +
                '<input type="text" value="' + (c.nombre || '') + '" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; margin-bottom:5px;" ' +
                'onchange="renombrarCarton(\'' + id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div style="display:flex; gap:4px;">' +
                '<button onclick="event.stopPropagation(); copiarLink(\'' + id + '\')" style="flex:1; padding:5px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.7rem;">🔗</button>' +
                '<button onclick="event.stopPropagation(); cambiarEstado(\'' + id + '\')" style="flex:1; padding:5px; background:#f59e0b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.7rem;">🔄</button>' +
                '<button onclick="event.stopPropagation(); eliminarCarton(\'' + id + '\')" style="flex:1; padding:5px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.7rem;">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
        
        console.log('✅ Lista actualizada: ' + total + ' cartones');
    });
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('Ingresa un número entre 1 y 100');
        return;
    }
    
    console.log('🎲 Generando ' + cantidad + ' cartones...');
    
    // Primero obtener el último número
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let maxNum = 0;
        snap.forEach(function(child) {
            const num = child.val().numero || 0;
            if (num > maxNum) maxNum = num;
        });
        
        console.log('Último número: ' + maxNum);
        
        let creados = 0;
        
        for (let i = 0; i < cantidad; i++) {
            const nuevoNum = maxNum + i + 1;
            const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5);
            const carton = generarCarton();
            
            const datos = {
                id: id,
                numero: nuevoNum,
                nombre: 'Cartón ' + nuevoNum,
                carton: carton,
                estado: 'disponible',
                asignadoA: '',
                creado: Date.now()
            };
            
            db.ref('salas/' + SALA_ID + '/cartones/' + id).set(datos, function(error) {
                if (error) {
                    console.error('❌ Error:', error);
                } else {
                    creados++;
                    console.log('✅ Cartón #' + nuevoNum + ' creado (' + creados + '/' + cantidad + ')');
                    
                    if (creados === cantidad) {
                        console.log('🎉 Todos creados. Actualizando lista...');
                        mostrarLista();
                        input.value = '';
                    }
                }
            });
        }
    });
}

// ============ VISTA PREVIA ============
function verPreview(id) {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val();
        if (!d || !d.carton) {
            preview.innerHTML = '<p>No encontrado</p>';
            return;
        }
        
        let html = '<div style="padding:20px;">';
        html += '<h2 style="color:#1e293b;">Cartón #' + d.numero + '</h2>';
        html += '<p style="color:#64748b;">Estado: ' + (d.estado || 'disponible') + '</p>';
        if (d.asignadoA) html += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        
        html += '<table style="width:100%; border-collapse:collapse; max-width:350px; margin:15px auto;">';
        html += '<tr style="background:#ff4d4d; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
        
        for (let f = 0; f < 5; f++) {
            html += '<tr>';
            ['B','I','N','G','O'].forEach(function(l) {
                const v = d.carton[l][f];
                const centro = (l === 'N' && f === 2);
                html += '<td style="padding:10px; border:2px solid #e2e8f0; text-align:center; font-weight:bold;';
                if (centro) html += 'background:#fef3c7;';
                html += '">' + (centro ? '⭐' : v) + '</td>';
            });
            html += '</tr>';
        }
        html += '</table></div>';
        
        preview.innerHTML = html;
    });
}

// ============ FUNCIONES ============
function renombrarCarton(id, nombre) {
    if (nombre && nombre.trim()) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

function cambiarEstado(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const estados = ['disponible', 'asignado', 'usado'];
        const actual = estados.indexOf(snap.val().estado || 'disponible');
        const nuevo = estados[(actual + 1) % 3];
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ estado: nuevo }, function() {
            mostrarLista();
            verPreview(id);
        });
    });
}

function copiarLink(id) {
    const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + id + '&sala=' + SALA_ID;
    navigator.clipboard.writeText(link).then(function() {
        alert('✅ Link copiado');
    });
}

function eliminarCarton(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).remove(function() {
            mostrarLista();
        });
    }
}

function borrarTodo() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + SALA_ID + '/cartones').remove(function() {
            document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>✅ Eliminados</h2></div>';
            mostrarLista();
        });
    }
}

function exportarJSON() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const data = { sala: SALA_ID, cartones: snap.val() || {} };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones-' + SALA_ID + '.json';
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
            db.ref('salas/' + SALA_ID + '/cartones').set(data.cartones, function() {
                mostrarLista();
            });
        }
    };
    reader.readAsText(file);
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let html = '<h2 style="color:#ff4d4d;">🔗 LINKS</h2>';
        const base = location.origin + location.pathname.replace('generar.html', '');
        snap.forEach(function(child) {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px; text-align:left;">';
            html += '<strong>#' + c.numero + '</strong> - ' + (c.nombre || '');
            html += '<input value="' + link + '" readonly style="width:100%; padding:5px; margin-top:5px;" onclick="this.select()">';
            html += '</div>';
        });
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    document.querySelectorAll('.card-carton').forEach(function(c) {
        c.classList.toggle('seleccionado');
    });
}

function filtrarCartones(t) {
    const f = t.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(function(c) {
        c.style.display = c.textContent.toLowerCase().includes(f) ? '' : 'none';
    });
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App iniciada');
    console.log('📁 Sala: ' + SALA_ID);
    
    // Botones
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', function() {
        alert('📄 Función PDF en desarrollo');
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
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    // Mostrar lista inicial
    mostrarLista();
});
