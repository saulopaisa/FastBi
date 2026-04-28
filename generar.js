// generar.js - Generador de Cartones de Bingo
// Versión estable y funcional

// ============ CONFIGURACIÓN DE FIREBASE ============
const firebaseConfig = {
    apiKey: "AIzaSyAOHYo0w41dV6TRarAaGt58Zxn4o47dNUE",
    authDomain: "bingofast.firebaseapp.com",
    databaseURL: "https://bingofast-default-rtdb.firebaseio.com",
    projectId: "bingofast",
    storageBucket: "bingofast.firebasestorage.app",
    messagingSenderId: "473863283329",
    appId: "1:473863283329:web:2c4bf96de167d105fa6380"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ============ CONFIGURACIÓN DE SALA ============
const CONFIG = {
    SALA_ID: localStorage.getItem('salaActiva') || generarSalaNueva()
};

function generarSalaNueva() {
    const salaId = 'sala-' + Date.now().toString(36);
    localStorage.setItem('salaActiva', salaId);
    return salaId;
}

// ============ GENERADOR DE CARTÓN ============
function generarCartonBingo() {
    return {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75)
    };
}

function generarColumna(min, max) {
    const numeros = [];
    const usados = new Set();
    
    while (numeros.length < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!usados.has(num)) {
            usados.add(num);
            numeros.push(num);
        }
    }
    
    numeros.sort((a, b) => a - b);
    numeros[2] = '⭐'; // Espacio libre en el centro
    return numeros;
}

// ============ FUNCIONES PRINCIPALES ============

// Generar lote de cartones
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('Ingresa un número entre 1 y 100');
        return;
    }
    
    console.log('Generando ' + cantidad + ' cartones...');
    
    let completados = 0;
    
    for (let i = 0; i < cantidad; i++) {
        const id = 'carton-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const carton = generarCartonBingo();
        
        const datosCarton = {
            id: id,
            nombre: 'Cartón ' + (i + 1),
            carton: carton,
            estado: 'disponible',
            creado: Date.now()
        };
        
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id)
            .set(datosCarton)
            .then(() => {
                completados++;
                console.log('✅ Cartón ' + completados + '/' + cantidad + ' creado');
                
                if (completados === cantidad) {
                    console.log('🎉 Todos los cartones generados');
                    input.value = '';
                }
            })
            .catch(error => {
                console.error('❌ Error al crear cartón:', error);
                alert('Error al crear cartón. Verifica la consola.');
            });
    }
}

// Ver vista previa del cartón
function verVistaPrevia(id) {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id)
        .once('value')
        .then(snap => {
            const datos = snap.val();
            if (datos && datos.carton) {
                preview.innerHTML = generarHTMLCarton(datos);
                
                // Marcar seleccionado en la lista
                document.querySelectorAll('.card-carton').forEach(c => c.classList.remove('seleccionado'));
                const card = document.querySelector('[data-id="' + id + '"]');
                if (card) card.classList.add('seleccionado');
            }
        });
}

function generarHTMLCarton(datos) {
    const { nombre, id, carton, estado } = datos;
    
    let html = '<div style="padding:20px;">';
    html += '<h2 style="color:#1e293b;">' + nombre + '</h2>';
    html += '<p style="color:#64748b;">ID: ' + id + '</p>';
    html += '<p>Estado: <strong>' + estado + '</strong></p>';
    
    // Tabla del cartón
    html += '<table style="width:100%; border-collapse:collapse; margin-top:20px; max-width:400px; margin-left:auto; margin-right:auto;">';
    html += '<tr style="background:#ff4d4d; color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    
    for (let fila = 0; fila < 5; fila++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(letra => {
            const valor = carton[letra][fila];
            const esCentro = (letra === 'N' && fila === 2);
            html += '<td style="padding:12px; border:2px solid #e2e8f0; text-align:center; font-weight:bold;';
            if (esCentro) html += 'background:#fef3c7;';
            html += '">' + valor + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table>';
    
    // Botones de acción
    html += '<div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">';
    html += '<button onclick="copiarLinkCarton(\'' + id + '\')" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">🔗 Copiar Link</button>';
    html += '<button onclick="eliminarCarton(\'' + id + '\')" style="background:#ef4444; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">🗑️ Eliminar</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

// Renombrar cartón
function renombrarCarton(id, nombre) {
    if (nombre.trim()) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() });
    }
}

// Copiar link del cartón
function copiarLinkCarton(id) {
    const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + id + '&sala=' + CONFIG.SALA_ID;
    navigator.clipboard.writeText(link).then(() => {
        mostrarToast('✅ Link copiado');
    });
}

// Eliminar cartón
function eliminarCarton(id) {
    if (confirm('¿Eliminar este cartón?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones/' + id).remove();
    }
}

// Borrar todos los cartones
function borrarTodo() {
    if (confirm('¿Eliminar TODOS los cartones?')) {
        db.ref('salas/' + CONFIG.SALA_ID + '/cartones').remove();
        document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>Cartones eliminados</h2></div>';
    }
}

// Exportar JSON
function exportarJSON() {
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').once('value').then(snap => {
        const data = {
            sala: CONFIG.SALA_ID,
            fecha: new Date().toISOString(),
            cartones: snap.val() || {}
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cartones-' + CONFIG.SALA_ID + '.json';
        a.click();
    });
}

// Importar JSON
function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.cartones && confirm('¿Importar ' + Object.keys(data.cartones).length + ' cartones?')) {
                db.ref('salas/' + CONFIG.SALA_ID + '/cartones').set(data.cartones);
            }
        } catch (err) {
            alert('Error al leer el archivo');
        }
    };
    reader.readAsText(file);
}

// Ver links de cartones
function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + CONFIG.SALA_ID + '/cartones').once('value').then(snap => {
        let html = '<h2 style="color:#ff4d4d; margin-bottom:20px;">🔗 LINKS DE CARTONES</h2>';
        
        if (!snap.exists()) {
            html += '<p>No hay cartones</p>';
        } else {
            snap.forEach(child => {
                const carton = child.val();
                const link = location.origin + location.pathname.replace('generar.html', '') + 'carton.html?carton=' + carton.id + '&sala=' + CONFIG.SALA_ID;
                
                html += '<div style="background:#f1f5f9; padding:10px; margin:5px 0; border-radius:6px; text-align:left;">';
                html += '<strong>' + carton.nombre + '</strong><br>';
                html += '<input value="' + link + '" readonly style="width:100%; padding:5px; margin-top:5px;" onclick="this.select()">';
                html += '</div>';
            });
        }
        
        preview.innerHTML = html;
    });
}

// Seleccionar todos los cartones
function seleccionarTodos() {
    document.querySelectorAll('.card-carton').forEach(card => {
        card.classList.toggle('seleccionado');
    });
}

// Filtrar cartones
function filtrarCartones(texto) {
    const filtro = texto.toLowerCase();
    document.querySelectorAll('.card-carton').forEach(card => {
        const nombre = (card.querySelector('.input-nombre-carton')?.value || '').toLowerCase();
        const id = (card.getAttribute('data-id') || '').toLowerCase();
        card.style.display = (nombre.includes(filtro) || id.includes(filtro)) ? '' : 'none';
    });
}

// Toast notification
function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ============ SINCRONIZACIÓN EN TIEMPO REAL ============
function iniciarSincronizacion() {
    const refCartones = db.ref('salas/' + CONFIG.SALA_ID + '/cartones');
    
    refCartones.on('value', snapshot => {
        // Actualizar contador
        const total = snapshot.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        // Actualizar lista
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones generados aún</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        
        const cartones = [];
        snapshot.forEach(child => {
            cartones.push({ key: child.key, ...child.val() });
        });
        
        cartones.sort((a, b) => (b.creado || 0) - (a.creado || 0));
        
        cartones.forEach(carton => {
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', carton.key);
            div.onclick = e => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verVistaPrevia(carton.key);
            };
            
            const estadoClass = 'estado-' + (carton.estado || 'disponible');
            
            div.innerHTML = 
                '<div class="carton-header">' +
                    '<span class="carton-id">#' + (carton.key || '').slice(-8) + '</span>' +
                    '<span class="carton-estado ' + estadoClass + '">' + (carton.estado || 'disponible') + '</span>' +
                '</div>' +
                '<input type="text" class="input-nombre-carton" value="' + (carton.nombre || '') + '" ' +
                    'onchange="renombrarCarton(\'' + carton.key + '\', this.value)" ' +
                    'onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
                    '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLinkCarton(\'' + carton.key + '\')">🔗</button>' +
                    '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + carton.key + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
    });
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Bingo Admin iniciado');
    console.log('📁 Sala:', CONFIG.SALA_ID);
    
    // Configurar eventos de botones
    document.getElementById('btnGenerar').onclick = generarLote;
    document.getElementById('btnGuardar').onclick = exportarJSON;
    document.getElementById('btnAbrir').onclick = () => document.getElementById('fileIn').click();
    document.getElementById('btnPDF').onclick = () => alert('Función PDF en desarrollo');
    document.getElementById('btnLinks').onclick = verLinks;
    document.getElementById('btnSelTodos').onclick = seleccionarTodos;
    document.getElementById('btnBorrar').onclick = borrarTodo;
    document.getElementById('btnIrJuego').onclick = () => location.href = 'ruleta.html';
    document.getElementById('fileIn').onchange = importarJSON;
    document.getElementById('buscadorCartones').oninput = e => filtrarCartones(e.target.value);
    
    // Iniciar sincronización
    iniciarSincronizacion();
    
    // Verificar conexión
    db.ref('.info/connected').on('value', snap => {
        console.log(snap.val() ? '🟢 Conectado a Firebase' : '🔴 Sin conexión');
    });
});
