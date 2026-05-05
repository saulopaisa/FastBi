// generar.js - Versión Final Completa con PDF Funcional

const SALA_ID = localStorage.getItem('salaActiva') || ('sala-' + Date.now());
localStorage.setItem('salaActiva', SALA_ID);

let seleccionados = new Set();

console.log('📁 Sala ID:', SALA_ID);

// Verificar conexión a Firebase
db.ref('.info/connected').on('value', function(snap) {
    console.log(snap.val() ? '🟢 Conectado a Firebase' : '🔴 Desconectado');
});

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

// ============ MOSTRAR LISTA ============
function mostrarLista() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        
        const contenedor = document.getElementById('listaCartones');
        contenedor.innerHTML = '';
        
        if (total === 0) {
            contenedor.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cartones</p>';
            actualizarBtnAsignar();
            return;
        }
        
        const cartones = [];
        snap.forEach(function(child) {
            cartones.push({ key: child.key, data: child.val() });
        });
        
        cartones.sort(function(a, b) {
            return (a.data.numero || 0) - (b.data.numero || 0);
        });
        
        cartones.forEach(function(item) {
            const c = item.data;
            const id = item.key;
            const estaSeleccionado = seleccionados.has(id);
            
            const div = document.createElement('div');
            div.className = 'card-carton';
            div.setAttribute('data-id', id);
            if (estaSeleccionado) div.classList.add('seleccionado');
            
            div.onclick = function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                verPreview(id);
            };
            
            div.innerHTML = 
                '<div class="carton-header">' +
                '<span class="carton-id"># ' + (c.numero || '?') + '</span>' +
                '<span class="carton-estado estado-' + (c.estado || 'disponible') + '">' + (c.estado || 'disponible') + '</span>' +
                '</div>' +
                (c.asignadoA ? '<div class="carton-asignado">👤 ' + c.asignadoA + '</div>' : '') +
                '<input type="text" class="input-nombre-carton" value="' + (c.nombre || '') + '" ' +
                'onchange="renombrarCarton(\'' + id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones">' +
                '<button class="btn-accion-pequeno seleccionar' + (estaSeleccionado ? ' activo' : '') + '" ' +
                'onclick="event.stopPropagation(); toggleSeleccion(\'' + id + '\')">' + (estaSeleccionado ? '✓' : '○') + '</button>' +
                '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLink(\'' + id + '\')">🔗</button>' +
                '<button class="btn-accion-pequeno estado-btn" onclick="event.stopPropagation(); cambiarEstado(\'' + id + '\')">🔄</button>' +
                '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + id + '\')">🗑️</button>' +
                '</div>';
            
            contenedor.appendChild(div);
        });
        
        actualizarBtnAsignar();
    });
}

// ============ ACTUALIZAR BOTÓN ASIGNAR ============
function actualizarBtnAsignar() {
    const btn = document.getElementById('btnAsignar');
    if (btn) {
        if (seleccionados.size > 0) {
            btn.textContent = '👤 ASIGNAR (' + seleccionados.size + ' cartones)';
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }
}

// ============ TOGGLE SELECCIÓN ============
function toggleSeleccion(id) {
    if (seleccionados.has(id)) {
        seleccionados.delete(id);
    } else {
        seleccionados.add(id);
    }
    mostrarLista();
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        alert('Ingresa un número entre 1 y 100');
        return;
    }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let maxNum = 0;
        snap.forEach(function(child) {
            const num = child.val().numero || 0;
            if (num > maxNum) maxNum = num;
        });
        
        let creados = 0;
        
        for (let i = 0; i < cantidad; i++) {
            const nuevoNum = maxNum + i + 1;
            const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5);
            const carton = generarCarton();
            
            db.ref('salas/' + SALA_ID + '/cartones/' + id).set({
                id: id,
                numero: nuevoNum,
                nombre: 'Cartón ' + nuevoNum,
                carton: carton,
                estado: 'disponible',
                asignadoA: '',
                creado: Date.now()
            }, function(error) {
                if (!error) {
                    creados++;
                    if (creados === cantidad) {
                        mostrarLista();
                        input.value = '';
                    }
                }
            });
        }
    });
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    if (seleccionados.size === 0) {
        alert('Selecciona al menos un cartón');
        return;
    }
    
    if (seleccionados.size > 4) {
        alert('⚠️ Máximo 4 cartones por jugador');
        return;
    }
    
    const nombre = prompt('👤 Nombre del jugador:');
    if (!nombre || !nombre.trim()) return;
    
    const nombreJugador = nombre.trim();
    const ids = Array.from(seleccionados);
    let completados = 0;
    
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({
            estado: 'asignado',
            asignadoA: nombreJugador
        }, function(error) {
            if (!error) {
                completados++;
                if (completados === ids.length) {
                    seleccionados.clear();
                    mostrarLista();
                    
                    const link = generarLinkJugador(nombreJugador, ids);
                    mostrarAsignacionExitosa(nombreJugador, ids, link);
                }
            }
        });
    });
}

function generarLinkJugador(nombre, ids) {
    const base = location.origin + location.pathname.replace('generar.html', '');
    return base + 'jugador.html?nombre=' + encodeURIComponent(nombre) + '&cartones=' + ids.join(',') + '&sala=' + SALA_ID;
}

function mostrarAsignacionExitosa(nombre, ids, link) {
    const preview = document.getElementById('vista-previa-contenido');
    
    let html = '<div style="padding:20px;">';
    html += '<h2 style="color:#10b981;">✅ ¡Asignado!</h2>';
    html += '<h3>👤 ' + nombre + '</h3>';
    html += '<p style="color:#64748b;">' + ids.length + ' cartón(es)</p>';
    
    html += '<div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">';
    html += '<p style="font-size:0.8rem; color:#64748b;">🔗 Link del jugador:</p>';
    html += '<input id="linkJugadorInput" value="' + link + '" readonly style="width:100%; padding:10px; border:2px solid #3b82f6; border-radius:6px; margin-bottom:10px;" onclick="this.select()">';
    html += '<button id="btnCopiarLink" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">📋 COPIAR LINK</button>';
    html += '</div>';
    html += '<button onclick="exportarPDFPorJugador(\'' + nombre.replace(/'/g, "\\'") + '\')" style="background:#8b5cf6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; margin-top:10px;">📄 PDF de ' + nombre + '</button>';
    html += '</div>';
    
    preview.innerHTML = html;
    
    document.getElementById('btnCopiarLink').addEventListener('click', function() {
        const input = document.getElementById('linkJugadorInput');
        input.select();
        navigator.clipboard.writeText(input.value);
        this.textContent = '✅ COPIADO!';
        this.style.background = '#10b981';
    });
}

// ============ VISTA PREVIA ============
function verPreview(id) {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val();
        if (!d || !d.carton) return;
        
        let html = '<div style="padding:15px;">';
        html += '<h3>Cartón #' + d.numero + '</h3>';
        if (d.asignadoA) html += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        
        html += '<table style="width:100%; border-collapse:collapse; max-width:300px; margin:10px auto;">';
        html += '<tr style="background:#ff4d4d; color:white;"><th style="padding:8px;">B</th><th style="padding:8px;">I</th><th style="padding:8px;">N</th><th style="padding:8px;">G</th><th style="padding:8px;">O</th></tr>';
        
        for (let f = 0; f < 5; f++) {
            html += '<tr>';
            ['B','I','N','G','O'].forEach(function(l) {
                const v = d.carton[l][f];
                const centro = (l === 'N' && f === 2);
                html += '<td style="padding:8px; border:2px solid #e2e8f0; text-align:center;';
                if (centro) html += 'background:#fef3c7;';
                html += '">' + (centro ? '⭐' : v) + '</td>';
            });
            html += '</tr>';
        }
        html += '</table></div>';
        preview.innerHTML = html;
    });
}

// ============ FUNCIONES AUXILIARES ============
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
        mostrarToast('✅ Link copiado');
    });
}

function eliminarCarton(id) {
    if (confirm('¿Eliminar este cartón?')) {
        seleccionados.delete(id);
        db.ref('salas/' + SALA_ID + '/cartones/' + id).remove(function() {
            mostrarLista();
        });
    }
}

function borrarTodo() {
    if (confirm('⚠️ ¿Eliminar TODOS los cartones?')) {
        seleccionados.clear();
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
        mostrarToast('💾 Exportado');
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
                mostrarToast('✅ Importado');
            });
        }
    };
    reader.readAsText(file);
}

function verJugadores() {
    const preview = document.getElementById('vista-previa-contenido');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const jugadores = {};
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA) {
                if (!jugadores[c.asignadoA]) jugadores[c.asignadoA] = [];
                jugadores[c.asignadoA].push({ id: c.id, numero: c.numero });
            }
        });
        
        if (Object.keys(jugadores).length === 0) {
            preview.innerHTML = '<div class="preview-empty"><h3>👥 No hay jugadores</h3><p>Asigna cartones primero</p></div>';
            return;
        }
        
        let html = '<h3 style="color:#ff4d4d; margin-bottom:15px;">👥 JUGADORES</h3><div style="max-height:60vh; overflow-y:auto;">';
        
        Object.keys(jugadores).forEach(function(nombre) {
            const cartones = jugadores[nombre];
            const ids = cartones.map(function(c) { return c.id; });
            const link = generarLinkJugador(nombre, ids);
            
            html += '<div style="background:#f1f5f9; padding:12px; margin:8px 0; border-radius:8px; text-align:left;">';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
            html += '<strong>👤 ' + nombre + '</strong>';
            html += '<span style="background:#3b82f6; color:white; padding:3px 10px; border-radius:12px; font-size:0.75rem;">' + cartones.length + ' cart.</span>';
            html += '</div>';
            html += '<div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px;">';
            cartones.forEach(function(c) {
                html += '<span style="background:#e2e8f0; color:#1e293b; padding:3px 8px; border-radius:10px; font-size:0.7rem;">#' + c.numero + '</span>';
            });
            html += '</div>';
            html += '<div style="display:flex; gap:5px;">';
            html += '<input value="' + link + '" readonly style="flex:1; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;" onclick="this.select()">';
            html += '<button onclick="navigator.clipboard.writeText(\'' + link + '\'); mostrarToast(\'✅ Link copiado\')" style="background:#3b82f6; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">📋</button>';
            html += '<button onclick="exportarPDFPorJugador(\'' + nombre.replace(/'/g, "\\'") + '\')" style="background:#8b5cf6; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">📄</button>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        preview.innerHTML = html;
    });
}

function verLinks() {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            preview.innerHTML = '<div class="preview-empty"><h3>📋 Sin cartones</h3></div>';
            return;
        }
        let html = '<h3 style="color:#ff4d4d;">🔗 LINKS</h3><div style="max-height:60vh; overflow-y:auto; text-align:left;">';
        const base = location.origin + location.pathname.replace('generar.html', '');
        snap.forEach(function(child) {
            const c = child.val();
            const link = base + 'carton.html?carton=' + c.id + '&sala=' + SALA_ID;
            html += '<div style="background:#f1f5f9; padding:8px; margin:4px 0; border-radius:6px;">';
            html += '<strong>#' + c.numero + '</strong>' + (c.asignadoA ? ' (' + c.asignadoA + ')' : '');
            html += '<input value="' + link + '" readonly style="width:100%; padding:4px; margin-top:4px; font-size:0.75rem;" onclick="this.select()">';
            html += '</div>';
        });
        html += '</div>';
        preview.innerHTML = html;
    });
}

function seleccionarTodos() {
    const cards = document.querySelectorAll('.card-carton');
    const todas = Array.from(cards).every(function(c) { return c.classList.contains('seleccionado'); });
    
    cards.forEach(function(card) {
        const id = card.getAttribute('data-id');
        if (todas) { seleccionados.delete(id); }
        else { seleccionados.add(id); }
    });
    mostrarLista();
}

function filtrarCartones(t) {
    document.querySelectorAll('.card-carton').forEach(function(c) {
        c.style.display = c.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none';
    });
}

function mostrarToast(mensaje, tipo) {
    const t = document.querySelector('.toast');
    if (t) t.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    if (tipo === 'error') toast.style.background = '#ef4444';
    document.body.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2000);
}

// ============ EXPORTAR PDF - TODOS ============
function exportarPDFTodos() {
    console.log('📄 Exportando TODOS los cartones...');
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) {
            alert('No hay cartones para exportar');
            return;
        }
        
        const cartones = [];
        snap.forEach(function(child) {
            cartones.push(child.val());
        });
        cartones.sort((a, b) => (a.numero || 0) - (b.numero || 0));
        
        console.log('Cartones encontrados:', cartones.length);
        
        const ventana = window.open('', '_blank', 'width=900,height=700');
        ventana.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF Cartones</title>');
        ventana.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>');
        ventana.document.write('</head><body style="margin:0;">');
        ventana.document.write('<div id="contenido-pdf" style="font-family:Arial;padding:20px;background:white;width:850px;">');
        ventana.document.write('<h1 style="text-align:center;color:#ff4d4d;margin-bottom:5px;">🎯 BINGO PRO</h1>');
        ventana.document.write('<h2 style="text-align:center;color:#1e293b;margin-bottom:5px;">Todos los Cartones</h2>');
        ventana.document.write('<p style="text-align:center;color:#64748b;font-size:12px;margin-bottom:20px;">Total: ' + cartones.length + ' cartones | ' + new Date().toLocaleDateString() + '</p>');
        ventana.document.write('<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">');
        
        cartones.forEach(function(c) {
            ventana.document.write(generarHTMLCartonPDF(c));
        });
        
        ventana.document.write('</div></div>');
        ventana.document.write('</body></html>');
        ventana.document.close();
        
        setTimeout(function() {
            const element = ventana.document.getElementById('contenido-pdf');
            
            const opt = {
                margin: 5,
                filename: 'todos-cartones-bingo.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            ventana.html2pdf().set(opt).from(element).save().then(function() {
                console.log('✅ PDF generado');
                mostrarToast('✅ PDF generado correctamente');
                setTimeout(function() { ventana.close(); }, 1000);
            }).catch(function(error) {
                console.error('❌ Error:', error);
                mostrarToast('❌ Error al generar PDF', 'error');
                ventana.close();
            });
        }, 1500);
    });
}

// ============ EXPORTAR PDF POR JUGADOR ============
function exportarPDFPorJugador(nombreJugador) {
    console.log('📄 Exportando cartones de:', nombreJugador);
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const cartonesJugador = [];
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA === nombreJugador) {
                cartonesJugador.push(c);
            }
        });
        
        if (cartonesJugador.length === 0) {
            alert('No se encontraron cartones para: ' + nombreJugador);
            return;
        }
        
        cartonesJugador.sort((a, b) => (a.numero || 0) - (b.numero || 0));
        console.log('Cartones de ' + nombreJugador + ':', cartonesJugador.length);
        
        const ventana = window.open('', '_blank', 'width=900,height=700');
        ventana.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF ' + nombreJugador + '</title>');
        ventana.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>');
        ventana.document.write('</head><body style="margin:0;">');
        ventana.document.write('<div id="contenido-pdf" style="font-family:Arial;padding:20px;background:white;width:850px;">');
        ventana.document.write('<h1 style="text-align:center;color:#ff4d4d;margin-bottom:5px;">🎯 BINGO PRO</h1>');
        ventana.document.write('<h2 style="text-align:center;color:#1e293b;margin-bottom:5px;">👤 ' + nombreJugador + '</h2>');
        ventana.document.write('<p style="text-align:center;color:#64748b;font-size:12px;margin-bottom:20px;">' + cartonesJugador.length + ' cartón(es) | ' + new Date().toLocaleDateString() + '</p>');
        ventana.document.write('<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">');
        
        cartonesJugador.forEach(function(c) {
            ventana.document.write(generarHTMLCartonPDF(c));
        });
        
        ventana.document.write('</div></div>');
        ventana.document.write('</body></html>');
        ventana.document.close();
        
        setTimeout(function() {
            const element = ventana.document.getElementById('contenido-pdf');
            
            const opt = {
                margin: 5,
                filename: 'cartones-' + nombreJugador.replace(/\s+/g, '-') + '.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            ventana.html2pdf().set(opt).from(element).save().then(function() {
                console.log('✅ PDF de ' + nombreJugador + ' generado');
                mostrarToast('✅ PDF de ' + nombreJugador + ' generado');
                setTimeout(function() { ventana.close(); }, 1000);
            }).catch(function(error) {
                console.error('❌ Error:', error);
                mostrarToast('❌ Error al generar PDF', 'error');
                ventana.close();
            });
        }, 1500);
    });
}

// ============ GENERAR HTML DE CARTÓN PARA PDF ============
function generarHTMLCartonPDF(c) {
    if (!c.carton) {
        return '<div style="border:2px solid red;padding:10px;">Error: Sin datos</div>';
    }
    
    const carton = c.carton;
    const numero = c.numero || '?';
    const asignadoA = c.asignadoA || '';
    
    let html = '';
    html += '<div style="border:3px solid #000;border-radius:12px;padding:12px;background:white;page-break-inside:avoid;">';
    html += '<div style="text-align:center;margin-bottom:8px;">';
    html += '<span style="background:#ff4d4d;color:white;padding:5px 15px;border-radius:20px;font-size:14px;font-weight:bold;">Cartón #' + numero + '</span>';
    html += '</div>';
    
    if (asignadoA) {
        html += '<p style="text-align:center;color:#10b981;margin:5px 0;font-size:13px;font-weight:bold;">👤 ' + asignadoA + '</p>';
    }
    
    html += '<table style="width:100%;border-collapse:collapse;margin-top:5px;">';
    html += '<tr style="background:#ff4d4d;color:white;">';
    html += '<th style="padding:10px;font-size:14px;border:2px solid #000;">B</th>';
    html += '<th style="padding:10px;font-size:14px;border:2px solid #000;">I</th>';
    html += '<th style="padding:10px;font-size:14px;border:2px solid #000;">N</th>';
    html += '<th style="padding:10px;font-size:14px;border:2px solid #000;">G</th>';
    html += '<th style="padding:10px;font-size:14px;border:2px solid #000;">O</th>';
    html += '</tr>';
    
    for (let f = 0; f < 5; f++) {
        html += '<tr>';
        ['B', 'I', 'N', 'G', 'O'].forEach(function(l) {
            const valor = carton[l] ? carton[l][f] : '?';
            const esCentro = (l === 'N' && f === 2);
            
            html += '<td style="padding:10px;border:2px solid #000;text-align:center;font-weight:bold;font-size:15px;';
            if (esCentro) {
                html += 'background:#fef3c7;font-size:18px;';
            }
            html += '">' + (esCentro ? '⭐' : valor) + '</td>';
        });
        html += '</tr>';
    }
    
    html += '</table></div>';
    return html;
}

// ============ MENÚ PDF ============
function abrirMenuPDF() {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        const jugadores = new Set();
        
        snap.forEach(function(child) {
            const c = child.val();
            if (c.asignadoA) jugadores.add(c.asignadoA);
        });
        
        let html = '<div style="padding:20px;">';
        html += '<h2 style="color:#ff4d4d;margin-bottom:20px;text-align:center;">📄 EXPORTAR PDF</h2>';
        
        html += '<button onclick="exportarPDFTodos()" style="width:100%;padding:15px;background:#ff4d4d;color:white;border:none;border-radius:10px;cursor:pointer;font-size:1.1rem;font-weight:bold;margin-bottom:25px;">';
        html += '📄 EXPORTAR TODOS LOS CARTONES (' + total + ')';
        html += '</button>';
        
        if (jugadores.size > 0) {
            html += '<h3 style="color:#1e293b;margin-bottom:15px;">👤 Por Jugador</h3>';
            html += '<div style="max-height:50vh;overflow-y:auto;">';
            
            jugadores.forEach(function(jugador) {
                let count = 0;
                snap.forEach(function(child) {
                    if (child.val().asignadoA === jugador) count++;
                });
                
                html += '<div style="background:#f1f5f9;padding:15px;margin:10px 0;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">';
                html += '<div>';
                html += '<strong style="font-size:1rem;">👤 ' + jugador + '</strong><br>';
                html += '<span style="color:#64748b;font-size:0.85rem;">' + count + ' cartón(es)</span>';
                html += '</div>';
                html += '<button onclick="exportarPDFPorJugador(\'' + jugador.replace(/'/g, "\\'") + '\')" style="background:#8b5cf6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:bold;">📄 PDF</button>';
                html += '</div>';
            });
            
            html += '</div>';
        } else {
            html += '<p style="color:#94a3b8;text-align:center;padding:20px;">No hay jugadores asignados aún</p>';
        }
        
        html += '</div>';
        preview.innerHTML = html;
    });
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bingo Pro Admin - Completo');
    
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() {
        document.getElementById('fileIn').click();
    });
    document.getElementById('btnPDF').addEventListener('click', abrirMenuPDF);
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnJugadores').addEventListener('click', verJugadores);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() {
        location.href = 'ruleta.html';
    });
    
    const btnAsignar = document.getElementById('btnAsignar');
    if (btnAsignar) {
        btnAsignar.addEventListener('click', asignarAJugador);
    }
    
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) {
        filtrarCartones(e.target.value);
    });
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarLote();
    });
    
    mostrarLista();
});
