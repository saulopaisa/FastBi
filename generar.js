// generar.js - ENFOCADO EN GENERACIÓN Y ASIGNACIÓN DE CARTONES
var db = firebase.database();

// ============ CONFIGURACIÓN ============
const CONFIG = {
    SALA_ID: localStorage.getItem('salaActiva') || generarSalaNueva(),
    MAX_CARTONES_POR_JUGADOR: 4  // Límite de cartones por persona
};

function generarSalaNueva() {
    const salaId = 'sala-' + Date.now().toString(36);
    localStorage.setItem('salaActiva', salaId);
    return salaId;
}

// ============ GENERADOR DE CARTÓN INDIVIDUAL ============
function generarCartonBingo() {
    return {
        B: generarColumna(1, 15),
        I: generarColumna(16, 30),
        N: generarColumna(31, 45),
        G: generarColumna(46, 60),
        O: generarColumna(61, 75),
        id: 'carton-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3)
    };
}

function generarColumna(min, max) {
    const disponibles = Array.from({length: max - min + 1}, (_, i) => i + min);
    const seleccionados = [];
    
    for (let i = 0; i < 5; i++) {
        const indice = Math.floor(Math.random() * disponibles.length);
        seleccionados.push(disponibles.splice(indice, 1)[0]);
    }
    
    const resultado = seleccionados.sort((a, b) => a - b);
    resultado[2] = '⭐'; // Espacio libre
    return resultado;
}

// ============ CREAR JUGADOR CON MÚLTIPLES CARTONES ============
window.crearJugador = function() {
    const apodo = prompt('👤 Nombre del jugador:');
    if (!apodo || !apodo.trim()) return;
    
    const cantidad = parseInt(prompt('🎫 ¿Cuántos cartones? (1-4):', '1'));
    if (isNaN(cantidad) || cantidad < 1 || cantidad > CONFIG.MAX_CARTONES_POR_JUGADOR) {
        alert(`❌ Debe ser entre 1 y ${CONFIG.MAX_CARTONES_POR_JUGADOR} cartones`);
        return;
    }
    
    const jugadorId = 'jug-' + Date.now().toString(36);
    const cartones = {};
    
    for (let i = 1; i <= cantidad; i++) {
        const carton = generarCartonBingo();
        cartones[carton.id] = {
            numero: i,  // Número de cartón para este jugador
            datos: carton,
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP
        };
    }
    
    const updates = {};
    updates[`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}`] = {
        id: jugadorId,
        apodo: apodo.trim(),
        cartones: cartones,
        totalCartones: cantidad,
        fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
        activo: true
    };
    
    db.ref().update(updates)
        .then(() => {
            console.log(`✅ Jugador ${apodo} creado con ${cantidad} cartones`);
            // Mostrar link para compartir
            mostrarLinkJugador(jugadorId, apodo);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            alert('Error al crear jugador');
        });
};

// ============ AGREGAR CARTONES A JUGADOR EXISTENTE ============
window.agregarCartones = function(jugadorId) {
    db.ref(`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}`).once('value', snap => {
        const jugador = snap.val();
        if (!jugador) return alert('❌ Jugador no encontrado');
        
        const cantidadActual = Object.keys(jugador.cartones || {}).length;
        const disponibles = CONFIG.MAX_CARTONES_POR_JUGADOR - cantidadActual;
        
        if (disponibles <= 0) {
            return alert(`❌ ${jugador.apodo} ya tiene el máximo de ${CONFIG.MAX_CARTONES_POR_JUGADOR} cartones`);
        }
        
        const cantidad = parseInt(prompt(`🎫 ¿Cuántos cartones agregar a ${jugador.apodo}? (Máx ${disponibles}):`, '1'));
        if (isNaN(cantidad) || cantidad < 1 || cantidad > disponibles) {
            return alert(`❌ Debe ser entre 1 y ${disponibles}`);
        }
        
        const nuevosCartones = {};
        for (let i = 0; i < cantidad; i++) {
            const carton = generarCartonBingo();
            nuevosCartones[carton.id] = {
                numero: cantidadActual + i + 1,
                datos: carton,
                fechaCreacion: firebase.database.ServerValue.TIMESTAMP
            };
        }
        
        db.ref(`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}/cartones`).update(nuevosCartones)
            .then(() => {
                db.ref(`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}/totalCartones`)
                    .set(cantidadActual + cantidad);
                console.log(`✅ ${cantidad} cartones agregados a ${jugador.apodo}`);
            });
    });
};

// ============ MOSTRAR LINK DE JUGADOR ============
function mostrarLinkJugador(jugadorId, apodo) {
    const link = generarLinkJugador(jugadorId);
    const preview = document.getElementById('vista-previa-contenido');
    
    preview.innerHTML = `
        <div style="background:white; padding:20px; border-radius:10px; color:#1e293b">
            <h2 style="color:#10b981; margin-bottom:15px;">✅ Jugador Creado</h2>
            <h3 style="color:#ff4d4d;">${apodo}</h3>
            <p style="color:#64748b; margin:10px 0;">Comparte este enlace:</p>
            <div style="display:flex; gap:10px; margin:15px 0;">
                <input id="linkJugador" value="${link}" readonly 
                       style="flex:1; padding:10px; border:2px solid #3b82f6; border-radius:6px; font-size:0.9rem;">
                <button onclick="copiarLink('${link}')" 
                        style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">
                    📋 COPIAR
                </button>
            </div>
            <p style="color:#ef4444; font-size:0.8rem;">⚠️ Guarda este enlace, es único para ${apodo}</p>
            <div style="margin-top:15px; display:flex; gap:10px;">
                <button onclick="window.agregarCartones('${jugadorId}')" 
                        style="background:#f59e0b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                    ➕ Agregar Cartones
                </button>
                <button onclick="window.exportarPDFJugador('${jugadorId}')" 
                        style="background:#8b5cf6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                    📄 Exportar PDF
                </button>
            </div>
        </div>
    `;
}

function generarLinkJugador(jugadorId) {
    const baseUrl = `${window.location.origin}${window.location.pathname.replace('generar.html', '')}`;
    return `${baseUrl}jugador.html?jugador=${jugadorId}&sala=${CONFIG.SALA_ID}`;
}

// ============ VISTA PREVIA DE JUGADOR ============
window.verVistaPrevia = function(jugadorId) {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;

    db.ref(`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}`).once('value', (snap) => {
        const jugador = snap.val();
        if (!jugador) {
            preview.innerHTML = '<p style="color:red">❌ Jugador no encontrado</p>';
            return;
        }
        
        preview.innerHTML = generarHTMLJugadorCompleto(jugador);
    });
};

function generarHTMLJugadorCompleto(jugador) {
    const { apodo, id, cartones } = jugador;
    const totalCartones = Object.keys(cartones || {}).length;
    
    let html = `
        <div style="background:white; padding:25px; border-radius:12px; color:#1e293b; max-width:800px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h2 style="color:#ff4d4d; margin:0;">${apodo}</h2>
                    <p style="color:#64748b; margin:5px 0;">🎫 ${totalCartones} cartón(es)</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.agregarCartones('${id}')" 
                            style="background:#f59e0b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                        ➕ Agregar
                    </button>
                    <button onclick="window.exportarPDFJugador('${id}')" 
                            style="background:#8b5cf6; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                        📄 PDF
                    </button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
    `;
    
    Object.values(cartones || {}).forEach(carton => {
        html += generarHTMLCartonIndividual(carton);
    });
    
    html += '</div></div>';
    return html;
}

function generarHTMLCartonIndividual(cartonInfo) {
    const carton = cartonInfo.datos || cartonInfo;
    
    return `
        <div style="border:2px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="text-align:center; color:#64748b; font-size:0.8rem; margin-bottom:5px;">
                Cartón #${cartonInfo.numero || '?'}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <tr style="background:#ff4d4d; color:white;">
                    <th>B</th><th>I</th><th>N</th><th>G</th><th>O</th>
                </tr>
                ${[0,1,2,3,4].map(fila => `
                    <tr>
                        ${['B','I','N','G','O'].map(letra => {
                            const valor = carton[letra][fila];
                            const esCentro = (letra === 'N' && fila === 2);
                            return `<td style="padding:5px; border:1px solid #e2e8f0; text-align:center;
                                         ${esCentro ? 'background:#fef3c7;' : ''}">
                                         ${esCentro ? '⭐' : valor}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
}

// ============ EXPORTAR PDF (USANDO html2pdf) ============
window.exportarPDFJugador = async function(jugadorId) {
    // Cargar html2pdf dinámicamente si no está disponible
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    db.ref(`salas/${CONFIG.SALA_ID}/jugadores/${jugadorId}`).once('value', (snap) => {
        const jugador = snap.val();
        if (!jugador) return alert('❌ Jugador no encontrado');
        
        // Crear elemento temporal para el PDF
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:20px; background:white; font-family:Arial;';
        pdfContent.innerHTML = `
            <h1 style="color:#ff4d4d; text-align:center; margin-bottom:5px;">BINGO PRO</h1>
            <h2 style="text-align:center; color:#1e293b;">${jugador.apodo}</h2>
            <p style="text-align:center; color:#64748b;">Sala: ${CONFIG.SALA_ID}</p>
            <p style="text-align:center; color:#64748b;">Fecha: ${new Date().toLocaleDateString()}</p>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px; margin-top:20px;">
                ${Object.values(jugador.cartones || {}).map(carton => `
                    <div style="border:2px solid #000; border-radius:10px; padding:15px; page-break-inside:avoid;">
                        <h3 style="text-align:center; color:#ff4d4d;">Cartón #${carton.numero}</h3>
                        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                            <tr style="background:#000; color:white;">
                                <th>B</th><th>I</th><th>N</th><th>G</th><th>O</th>
                            </tr>
                            ${[0,1,2,3,4].map(fila => `
                                <tr>
                                    ${['B','I','N','G','O'].map(letra => {
                                        const valor = carton.datos[letra][fila];
                                        const esCentro = (letra === 'N' && fila === 2);
                                        return `<td style="border:1px solid #000; padding:8px; text-align:center; font-weight:bold;
                                                     ${esCentro ? 'background:#ffd700;' : ''}">
                                                     ${esCentro ? '⭐' : valor}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Configuración del PDF
        const opt = {
            margin: 10,
            filename: `bingo-${jugador.apodo.replace(/\s+/g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generar PDF
        html2pdf().set(opt).from(pdfContent).save()
            .then(() => console.log('✅ PDF generado para', jugador.apodo));
    });
};

// ============ EXPORTAR TODOS COMO PDF ============
window.exportarTodoPDF = async function() {
    if (typeof html2pdf === 'undefined') {
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    db.ref(`salas/${CONFIG.SALA_ID}/jugadores`).once('value', (snap) => {
        if (!snap.exists()) return alert('No hay jugadores para exportar');
        
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'padding:20px; background:white; font-family:Arial;';
        
        let html = '<h1 style="color:#ff4d4d; text-align:center;">BINGO PRO - Todos los Cartones</h1>';
        html += `<p style="text-align:center; color:#64748b;">Sala: ${CONFIG.SALA_ID} | ${new Date().toLocaleDateString()}</p>`;
        
        snap.forEach(child => {
            const jugador = child.val();
            html += `<div style="page-break-before:always; margin-top:20px;">
                <h2 style="color:#ff4d4d;">${jugador.apodo}</h2>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px;">
                    ${Object.values(jugador.cartones || {}).map(carton => `
                        <div style="border:2px solid #000; border-radius:8px; padding:10px;">
                            <h4 style="text-align:center;">Cartón #${carton.numero}</h4>
                            ${generarTablaCarton(carton.datos)}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        });
        
        pdfContent.innerHTML = html;
        
        const opt = {
            margin: 10,
            filename: `bingo-todos-${CONFIG.SALA_ID}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(pdfContent).save();
    });
};

function generarTablaCarton(carton) {
    return `
        <table style="width:100%; border-collapse:collapse;">
            <tr style="background:#000; color:white;">
                <th>B</th><th>I</th><th>N</th><th>G</th><th>O</th>
            </tr>
            ${[0,1,2,3,4].map(fila => `
                <tr>
                    ${['B','I','N','G','O'].map(letra => {
                        const valor = carton[letra][fila];
                        const esCentro = (letra === 'N' && fila === 2);
                        return `<td style="border:1px solid #000; padding:6px; text-align:center;
                                     ${esCentro ? 'background:#ffd700;' : ''}">
                                     ${esCentro ? '⭐' : valor}</td>`;
                    }).join('')}
                </tr>
            `).join('')}
        </table>
    `;
}

// ============ UTILIDADES ============
function copiarLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ COPIADO!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#3b82f6';
        }, 2000);
    });
}

async function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============ SINCRONIZACIÓN DE LISTA ============
function cargarJugadores() {
    db.ref(`salas/${CONFIG.SALA_ID}/jugadores`).on('value', (snapshot) => {
        // Actualizar contador
        const btnContador = document.getElementById('contadorRegistrados');
        const total = snapshot.numChildren() || 0;
        if (btnContador) {
            btnContador.innerHTML = `👥 REGISTRADOS: ${total}`;
        }

        // Actualizar lista
        const contenedor = document.getElementById('listaCartones');
        if (!contenedor) return;
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay jugadores creados</p>';
            return;
        }
        
        contenedor.innerHTML = '';
        
        const jugadores = [];
        snapshot.forEach(child => {
            jugadores.push({ id: child.key, ...child.val() });
        });
        
        // Ordenar por fecha
        jugadores
            .sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0))
            .forEach(jugador => {
                const div = document.createElement('div');
                div.className = "card-jugador";
                div.style.cursor = 'pointer';
                
                const totalCartones = Object.keys(jugador.cartones || {}).length;
                
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="flex:1;" onclick="window.verVistaPrevia('${jugador.id}')">
                            <h4 style="margin:0; color:#ff4d4d;">${jugador.apodo}</h4>
                            <p style="margin:5px 0; color:#64748b; font-size:0.8rem;">🎫 ${totalCartones} cartones</p>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button onclick="window.agregarCartones('${jugador.id}')" 
                                    style="background:#f59e0b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                                ➕
                            </button>
                            <button onclick="window.exportarPDFJugador('${jugador.id}')" 
                                    style="background:#8b5cf6; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                                📄
                            </button>
                        </div>
                    </div>
                `;
                contenedor.appendChild(div);
            });
    });
}

// ============ BOTONES PRINCIPALES ============
window.generarLote = function() {
    window.crearJugador(); // Ahora crear jugador reemplaza generar lote
};

window.exportarJSON = function() {
    db.ref(`salas/${CONFIG.SALA_ID}`).once('value', (snap) => {
        if (!snap.exists()) {
            return alert('No hay datos para exportar');
        }
        
        const data = {
            version: '2.0',
            salaId: CONFIG.SALA_ID,
            fechaExportacion: new Date().toISOString(),
            datos: snap.val()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bingo-backup-${CONFIG.SALA_ID}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
};

window.importarJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.datos || !data.datos.jugadores) {
                throw new Error('Formato inválido');
            }
            
            if (confirm(`¿Importar ${Object.keys(data.datos.jugadores).length} jugadores?`)) {
                db.ref(`salas/${CONFIG.SALA_ID}`).set(data.datos)
                    .then(() => console.log('✅ Datos importados'))
                    .catch(err => console.error('❌ Error:', err));
            }
        } catch (error) {
            alert('❌ Error al importar: ' + error.message);
        }
    };
    reader.readAsText(file);
};

window.verTodos = function() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref(`salas/${CONFIG.SALA_ID}/jugadores`).once('value', (snap) => {
        if (!snap.exists()) {
            preview.innerHTML = '<p>No hay jugadores para mostrar</p>';
            return;
        }
        
        let html = '<h2 style="color:#ff4d4d; margin-bottom:20px;">🔗 LINKS DE JUGADORES</h2>';
        html += '<div style="max-height:500px; overflow-y:auto;">';
        
        snap.forEach(child => {
            const jugador = child.val();
            const link = generarLinkJugador(jugador.id);
            const totalCartones = Object.keys(jugador.cartones || {}).length;
            
            html += `
                <div style="background:#f1f5f9; padding:15px; margin:10px 0; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${jugador.apodo}</strong>
                        <span style="color:#64748b; font-size:0.8rem;">🎫 ${totalCartones} cartones</span>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <input value="${link}" readonly 
                               style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">
                        <button onclick="copiarLink('${link}')" 
                                style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">
                            📋
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        preview.innerHTML = html;
    });
};

window.borrarTodo = function() {
    if (confirm('⚠️ ¿Eliminar TODOS los jugadores y cartones de esta sala?')) {
        db.ref(`salas/${CONFIG.SALA_ID}`).remove()
            .then(() => {
                document.getElementById('vista-previa-contenido').innerHTML = 
                    '<h2 style="color:#10b981;">✅ Sala limpiada</h2>';
            });
    }
};

// ============ INICIALIZACIÓN ============
document.addEventListener("DOMContentLoaded", () => {
    console.log('🎮 Bingo Admin - Sistema de Cartones Múltiples');
    console.log('📁 Sala:', CONFIG.SALA_ID);
    console.log('👥 Máx cartones por jugador:', CONFIG.MAX_CARTONES_POR_JUGADOR);
    
    cargarJugadores();
});
