// generar.js - Lógica principal del generador de cartones

var cartonesGenerados = [];

// ============ GENERAR CARTÓN ============
function generarCarton() {
    var rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    var letras = ['B','I','N','G','O'];
    var carton = {B:[],I:[],N:[],G:[],O:[]};
    var usados = new Set();

    for (var col = 0; col < 5; col++) {
        var min = rangos[col][0], max = rangos[col][1];
        var nums = [];
        while (nums.length < 5) {
            var n = Math.floor(Math.random()*(max-min+1))+min;
            if (!usados.has(n)) { usados.add(n); nums.push(n); }
        }
        nums.sort(function(a,b){return a-b;});
        for (var row = 0; row < 5; row++) {
            carton[letras[col]].push((col===2 && row===2) ? 'FREE' : nums[row]);
        }
    }
    return carton;
}

// ============ GENERAR MÚLTIPLES ============
function generarCartones() {
    var cantidad = parseInt(document.getElementById('cantidadGenerar').value) || 10;
    if (cantidad < 1 || cantidad > 500) { mostrarToast('⚠️ Cantidad entre 1 y 500', 'error'); return; }
    
    cartonesGenerados = [];
    for (var i = 0; i < cantidad; i++) {
        cartonesGenerados.push({
            id: 'carton_' + Date.now() + '_' + i,
            numero: i + 1,
            carton: generarCarton(),
            asignadoA: null,
            estado: 'disponible'
        });
    }
    mostrarCartones();
    actualizarContadores();
    mostrarToast('✅ ' + cantidad + ' cartones generados', 'success');
}

// ============ MOSTRAR CARTONES ============
function mostrarCartones() {
    var grid = document.getElementById('cartonesGrid');
    if (cartonesGenerados.length === 0) {
        grid.innerHTML = '<p class="placeholder">No hay cartones. Genera o importa.</p>';
        return;
    }

    grid.innerHTML = '';
    var letras = ['B','I','N','G','O'];

    cartonesGenerados.forEach(function(c, index) {
        var card = document.createElement('div');
        card.className = 'carton-card';
        card.id = 'cartonCard-' + index;
        
        var html = '<div class="carton-header-info">';
        html += '<span class="carton-num">#' + c.numero + '</span>';
        html += c.asignadoA ? 
            '<span class="carton-asignado">👤 ' + c.asignadoA + '</span>' : 
            '<span class="carton-disponible">Disponible</span>';
        html += '</div>';
        
        html += '<div class="carton-bingo-header">';
        letras.forEach(function(l) { html += '<div>' + l + '</div>'; });
        html += '</div>';
        
        html += '<div class="carton-bingo-grid">';
        for (var f = 0; f < 5; f++) {
            letras.forEach(function(l) {
                var v = c.carton[l][f];
                var centro = (l==='N' && f===2);
                html += '<div class="carton-bingo-cell'+(centro?' free':'')+'">'+(centro?'⭐':v)+'</div>';
            });
        }
        html += '</div>';
        
        html += '<div class="carton-acciones">';
        html += '<button class="btn btn-asignar" onclick="asignarIndividual('+index+')">👤 Asignar</button>';
        html += '<button class="btn btn-eliminar" onclick="eliminarCarton('+index+')">🗑️ Eliminar</button>';
        html += '</div>';
        
        card.innerHTML = html;
        grid.appendChild(card);
    });
}

// ============ ASIGNAR CARTONES ============
function asignarCartones() {
    var nombre = document.getElementById('nombreJugador').value.trim();
    var cantidad = parseInt(document.getElementById('cantidadAsignar').value);
    
    if (!nombre) { mostrarToast('⚠️ Ingresa un nombre de jugador', 'error'); return; }
    
    // Contar cuántos ya tiene asignados
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    var maxPermitido = 2;
    var faltantes = cantidad - yaAsignados;
    
    if (faltantes <= 0) {
        mostrarToast('⚠️ ' + nombre + ' ya tiene ' + yaAsignados + ' cartones (máx ' + maxPermitido + ')', 'error');
        return;
    }
    
    if (yaAsignados + faltantes > maxPermitido) {
        faltantes = maxPermitido - yaAsignados;
        if (faltantes <= 0) {
            mostrarToast('⚠️ ' + nombre + ' ya tiene el máximo de ' + maxPermitido + ' cartones', 'error');
            return;
        }
    }
    
    var asignados = 0;
    for (var i = 0; i < cartonesGenerados.length && asignados < faltantes; i++) {
        if (!cartonesGenerados[i].asignadoA) {
            cartonesGenerados[i].asignadoA = nombre;
            cartonesGenerados[i].estado = 'asignado';
            asignados++;
        }
    }
    
    if (asignados === 0) {
        mostrarToast('⚠️ No hay cartones disponibles para asignar', 'error');
        return;
    }
    
    mostrarCartones();
    actualizarContadores();
    mostrarToast('✅ ' + asignados + ' cartones asignados a ' + nombre + ' (total: ' + (yaAsignados+asignados) + ')', 'success');
}

function asignarIndividual(index) {
    var carton = cartonesGenerados[index];
    var nombre = prompt('Nombre del jugador para cartón #' + carton.numero + ':');
    if (!nombre) return;
    
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    
    if (yaAsignados >= 2 && carton.asignadoA !== nombre) {
        mostrarToast('⚠️ ' + nombre + ' ya tiene 2 cartones (máximo permitido)', 'error');
        return;
    }
    
    carton.asignadoA = nombre;
    carton.estado = 'asignado';
    mostrarCartones();
    actualizarContadores();
    mostrarToast('✅ Cartón #' + carton.numero + ' asignado a ' + nombre, 'success');
}

function eliminarCarton(index) {
    if (confirm('¿Eliminar cartón #' + cartonesGenerados[index].numero + '?')) {
        cartonesGenerados.splice(index, 1);
        // Renumerar
        cartonesGenerados.forEach(function(c, i) {
            c.numero = i + 1;
        });
        mostrarCartones();
        actualizarContadores();
        mostrarToast('🗑️ Cartón eliminado', 'error');
    }
}

// ============ BUSCADOR DE CARTONES ============
function buscarCarton() {
    var termino = document.getElementById('buscarCarton').value.trim().toLowerCase();
    var resultadosDiv = document.getElementById('resultadosBusqueda');
    
    if (!termino || termino.length < 1) {
        resultadosDiv.innerHTML = '';
        return;
    }
    
    // Buscar por número de cartón o nombre de jugador
    var resultados = cartonesGenerados.filter(function(c) {
        var numStr = String(c.numero);
        var nombre = (c.asignadoA || '').toLowerCase();
        return numStr.includes(termino) || nombre.includes(termino);
    });
    
    if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:10px;font-size:0.8em;">❌ Sin resultados para "' + termino + '"</p>';
        return;
    }
    
    // Limitar a 20 resultados para no sobrecargar
    resultados = resultados.slice(0, 20);
    
    resultadosDiv.innerHTML = '';
    resultados.forEach(function(c) {
        var idx = cartonesGenerados.indexOf(c);
        var div = document.createElement('div');
        div.className = 'resultado-busqueda';
        
        div.innerHTML = 
            '<div class="info">' +
            '<strong style="color:#ffca28;">#' + c.numero + '</strong>' +
            '<span style="color:#94a3b8;">' + (c.asignadoA ? '👤 ' + c.asignadoA : '📋 Disponible') + '</span>' +
            '</div>' +
            '<button class="asignar-btn" onclick="event.stopPropagation();asignarDesdeBusqueda(' + idx + ')">👤 ASIGNAR</button>';
        
        // Click en el resultado scrollea al cartón
        div.onclick = function() {
            var cartonCard = document.getElementById('cartonCard-' + idx);
            if (cartonCard) {
                cartonCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight temporal
                cartonCard.style.boxShadow = '0 0 25px #ffca28';
                cartonCard.style.border = '2px solid #ffca28';
                setTimeout(function() {
                    cartonCard.style.boxShadow = '';
                    cartonCard.style.border = '';
                }, 2000);
            }
        };
        
        resultadosDiv.appendChild(div);
    });
    
    // Mostrar contador de resultados
    var contador = document.createElement('div');
    contador.style.cssText = 'text-align:center;font-size:0.7em;color:#64748b;padding:5px;';
    contador.textContent = 'Mostrando ' + resultados.length + ' de ' + 
        cartonesGenerados.filter(function(c) {
            var numStr = String(c.numero);
            var nombre = (c.asignadoA || '').toLowerCase();
            return numStr.includes(termino) || nombre.includes(termino);
        }).length + ' resultados';
    resultadosDiv.appendChild(contador);
}

function asignarDesdeBusqueda(index) {
    var carton = cartonesGenerados[index];
    var nombre = prompt('Nombre del jugador para cartón #' + carton.numero + ' (' + (carton.asignadoA || 'Disponible') + '):');
    if (!nombre) return;
    
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    
    if (yaAsignados >= 2 && carton.asignadoA !== nombre) {
        mostrarToast('⚠️ ' + nombre + ' ya tiene 2 cartones (máximo permitido)', 'error');
        return;
    }
    
    carton.asignadoA = nombre;
    carton.estado = 'asignado';
    mostrarCartones();
    actualizarContadores();
    buscarCarton(); // Refrescar búsqueda
    mostrarToast('✅ Cartón #' + carton.numero + ' asignado a ' + nombre, 'success');
}

// ============ CONTADORES ============
function actualizarContadores() {
    document.getElementById('totalCartones').textContent = cartonesGenerados.length;
    var asignados = cartonesGenerados.filter(function(c) { return c.asignadoA; }).length;
    document.getElementById('totalAsignados').textContent = asignados;
    document.getElementById('totalDisponibles').textContent = cartonesGenerados.length - asignados;
}

// ============ GUARDAR EN FIREBASE ============
function guardarEnFirebase() {
    if (cartonesGenerados.length === 0) { 
        mostrarToast('⚠️ No hay cartones para guardar', 'error'); 
        return; 
    }
    
    if (!confirm('¿Guardar ' + cartonesGenerados.length + ' cartones en Firebase?\n\nSala: ' + SALA_ID + '\n\nEsto reemplazará los cartones existentes.')) {
        return;
    }
    
    // Primero eliminar cartones anteriores
    db.ref('salas/' + SALA_ID + '/cartones').remove().then(function() {
        // Guardar nuevos
        var updates = {};
        cartonesGenerados.forEach(function(c) {
            updates['salas/' + SALA_ID + '/cartones/' + c.id] = {
                numero: c.numero,
                carton: c.carton,
                asignadoA: c.asignadoA || null,
                estado: c.asignadoA ? 'asignado' : 'disponible'
            };
        });
        
        return db.ref().update(updates);
    }).then(function() {
        mostrarToast('✅ ' + cartonesGenerados.length + ' cartones guardados en Firebase', 'success');
    }).catch(function(err) {
        console.error('Error al guardar:', err);
        mostrarToast('❌ Error al guardar: ' + err.message, 'error');
    });
}

// ============ IMPORTAR DESDE FIREBASE ============
function importarDesdeFirebase() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(function(snap) {
        var data = snap.val();
        
        if (!data) { 
            mostrarToast('⚠️ No hay cartones guardados en esta sala', 'error'); 
            return; 
        }
        
        cartonesGenerados = [];
        Object.entries(data).forEach(function(entry) {
            var id = entry[0], c = entry[1];
            cartonesGenerados.push({
                id: id,
                numero: c.numero || 0,
                carton: c.carton,
                asignadoA: c.asignadoA || null,
                estado: c.estado || (c.asignadoA ? 'asignado' : 'disponible')
            });
        });
        
        // Ordenar por número
        cartonesGenerados.sort(function(a, b) { return a.numero - b.numero; });
        
        // Renumerar si es necesario
        cartonesGenerados.forEach(function(c, i) {
            c.numero = i + 1;
        });
        
        mostrarCartones();
        actualizarContadores();
        mostrarToast('✅ ' + cartonesGenerados.length + ' cartones importados', 'success');
    }).catch(function(err) {
        console.error('Error al importar:', err);
        mostrarToast('❌ Error al importar: ' + err.message, 'error');
    });
}

// ============ GENERAR LINK PARA JUGADOR ============
function generarLinkJugador() {
    var nombre = document.getElementById('nombreJugador').value.trim();
    
    if (!nombre) { 
        mostrarToast('⚠️ Ingresa un nombre de jugador primero', 'error'); 
        return; 
    }
    
    var cartonesJugador = cartonesGenerados.filter(function(c) { 
        return c.asignadoA === nombre; 
    });
    
    if (cartonesJugador.length === 0) { 
        mostrarToast('⚠️ ' + nombre + ' no tiene cartones asignados', 'error'); 
        return; 
    }
    
    var link = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'jugador.html?sala=' + encodeURIComponent(SALA_ID);
    document.getElementById('linkGenerado').textContent = link;
    document.getElementById('linkGenerado').style.color = '#10b981';
    document.getElementById('modalLink').classList.add('activo');
    
    // Mostrar info de cartones
    var infoCartones = document.getElementById('infoCartonesJugador');
    if (infoCartones) {
        infoCartones.textContent = 'Cartones asignados: ' + cartonesJugador.map(function(c) { return '#' + c.numero; }).join(', ');
    }
}

function copiarLink() {
    var link = document.getElementById('linkGenerado').textContent;
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link copiado al portapapeles', 'success');
    }).catch(function() {
        prompt('📋 Copia este link manualmente:', link);
    });
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('activo');
}

// ============ IMPRIMIR ============
function imprimirCartones() {
    if (cartonesGenerados.length === 0) { 
        mostrarToast('⚠️ No hay cartones para imprimir', 'error'); 
        return; 
    }
    mostrarToast('🖨️ Abriendo vista de impresión...', 'success');
    setTimeout(function() {
        window.print();
    }, 500);
}

// ============ TOAST ============
function mostrarToast(mensaje, tipo) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = mensaje;
    toast.className = 'toast ' + (tipo || '');
    
    // Forzar reflow
    toast.offsetHeight;
    
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() { 
        toast.classList.remove('show'); 
    }, 2500);
}

// ============ EXPORTAR COPIAS DE SEGURIDAD ============
function exportarCartones() {
    if (cartonesGenerados.length === 0) {
        mostrarToast('⚠️ No hay cartones para exportar', 'error');
        return;
    }
    
    var data = JSON.stringify(cartonesGenerados, null, 2);
    var blob = new Blob([data], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cartones_' + SALA_ID + '_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('✅ Copia de seguridad descargada', 'success');
}

// ============ IMPORTAR COPIA DE SEGURIDAD ============
function importarCopiaSeguridad() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var data = JSON.parse(event.target.result);
                if (Array.isArray(data) && data.length > 0 && data[0].carton) {
                    cartonesGenerados = data;
                    mostrarCartones();
                    actualizarContadores();
                    mostrarToast('✅ ' + data.length + ' cartones importados del archivo', 'success');
                } else {
                    mostrarToast('❌ Archivo no válido', 'error');
                }
            } catch (err) {
                mostrarToast('❌ Error al leer el archivo', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
