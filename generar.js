// generar.js - Lógica principal del generador de cartones

var cartonesGenerados = [];
var cartonesSeleccionados = [];
var MAX_GANADORES_POR_NUMERO = 3; // Máximo de cartones con el mismo número

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

// ============ VERIFICAR DUPLICADOS ============
function cartonExiste(carton) {
    return cartonesGenerados.some(function(c) {
        var letras = ['B','I','N','G','O'];
        return letras.every(function(l) {
            return c.carton[l].every(function(num, i) {
                return num === carton[l][i];
            });
        });
    });
}

function contarCartonesSimilares(carton) {
    var ref = carton.B.join(',');
    return cartonesGenerados.filter(function(c) {
        return c.carton.B.join(',') === ref;
    }).length;
}

// ============ GENERAR MÚLTIPLES ============
function generarCartones() {
    var cantidad = parseInt(document.getElementById('cantidadGenerar').value) || 10;
    if (cantidad < 1 || cantidad > 500) { 
        mostrarToast('⚠️ Cantidad entre 1 y 500', 'error'); 
        return; 
    }
    
    cartonesGenerados = [];
    cartonesSeleccionados = [];
    var intentos = 0;
    var maxIntentos = cantidad * 10;
    
    for (var i = 0; i < cantidad && intentos < maxIntentos; i++) {
        var nuevoCarton = generarCarton();
        
        if (cartonExiste(nuevoCarton)) {
            i--;
            intentos++;
            continue;
        }
        
        var similares = contarCartonesSimilares(nuevoCarton);
        if (similares >= MAX_GANADORES_POR_NUMERO) {
            i--;
            intentos++;
            continue;
        }
        
        cartonesGenerados.push({
            id: 'carton_' + Date.now() + '_' + i,
            numero: i + 1,
            carton: nuevoCarton,
            asignadoA: null,
            estado: 'disponible'
        });
        
        intentos = 0;
    }
    
    mostrarCartones();
    actualizarContadores();
    guardarEnFirebase();
    
    if (cartonesGenerados.length < cantidad) {
        mostrarToast('⚠️ Solo se generaron ' + cartonesGenerados.length + ' de ' + cantidad + ' (límite de variedad)', 'error');
    } else {
        mostrarToast('✅ ' + cantidad + ' cartones generados (máx ' + MAX_GANADORES_POR_NUMERO + ' por número)', 'success');
    }
}

// ============ MOSTRAR CARTONES ============
function mostrarCartones(filtrarTermino) {
    var grid = document.getElementById('cartonesGrid');
    
    var cartonesAMostrar = cartonesGenerados;
    
    if (filtrarTermino) {
        var termino = filtrarTermino.toLowerCase();
        cartonesAMostrar = cartonesGenerados.filter(function(c) {
            var numStr = String(c.numero);
            var nombre = (c.asignadoA || '').toLowerCase();
            return numStr.includes(termino) || nombre.includes(termino);
        });
    }
    
    if (cartonesAMostrar.length === 0) {
        grid.innerHTML = '<p class="placeholder">' + (filtrarTermino ? 'Sin resultados para "' + filtrarTermino + '"' : 'No hay cartones. Genera o importa.') + '</p>';
        return;
    }

    grid.innerHTML = '';
    var letras = ['B','I','N','G','O'];

    cartonesAMostrar.forEach(function(c) {
        var index = cartonesGenerados.indexOf(c);
        var card = document.createElement('div');
        card.className = 'carton-card';
        card.id = 'cartonCard-' + index;
        
        var html = '<div class="carton-header-info">';
        html += '<span class="carton-num">#' + c.numero + '</span>';
        html += c.asignadoA ? 
            '<span class="carton-asignado">👤 ' + c.asignadoA + '</span>' : 
            '<span class="carton-disponible">📋 Disponible</span>';
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

// ============ ASIGNAR INDIVIDUAL ============
function asignarIndividual(index) {
    var carton = cartonesGenerados[index];
    var nombre = prompt('Nombre del jugador para cartón #' + carton.numero + ':');
    if (!nombre) return;
    
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    if (yaAsignados >= 2 && carton.asignadoA !== nombre) {
        mostrarToast('⚠️ ' + nombre + ' ya tiene 2 cartones (máximo)', 'error');
        return;
    }
    
    carton.asignadoA = nombre;
    carton.estado = 'asignado';
    mostrarCartones();
    actualizarContadores();
    actualizarListaJugadores();
    guardarEnFirebase();
    mostrarToast('✅ Cartón #' + carton.numero + ' → ' + nombre, 'success');
}

// ============ ELIMINAR CARTÓN ============
function eliminarCarton(index) {
    if (confirm('¿Eliminar cartón #' + cartonesGenerados[index].numero + '?')) {
        cartonesGenerados.splice(index, 1);
        cartonesGenerados.forEach(function(c, i) { c.numero = i + 1; });
        mostrarCartones();
        actualizarContadores();
        actualizarListaJugadores();
        guardarEnFirebase();
        mostrarToast('🗑️ Cartón eliminado', 'error');
    }
}

function borrarTodosCartones() {
    if (cartonesGenerados.length === 0) {
        mostrarToast('⚠️ No hay cartones para borrar', 'error');
        return;
    }
    if (confirm('⚠️ ¿Borrar TODOS los ' + cartonesGenerados.length + ' cartones?\n\nEsta acción no se puede deshacer.')) {
        cartonesGenerados = [];
        cartonesSeleccionados = [];
        mostrarCartones();
        actualizarContadores();
        actualizarListaJugadores();
        guardarEnFirebase();
        document.getElementById('resultadosBusqueda').innerHTML = '<p style="color:#94a3b8;text-align:center;font-size:0.8em;padding:10px;">Escribe para buscar cartones</p>';
        document.getElementById('seleccionadosInfo').style.display = 'none';
        mostrarToast('🗑️ Todos los cartones eliminados', 'error');
    }
}

// ============ BUSCADOR CON CHECKBOXES ============
function buscarCarton() {
    var termino = document.getElementById('buscarCarton').value.trim();
    var resultadosDiv = document.getElementById('resultadosBusqueda');
    var seleccionadosInfo = document.getElementById('seleccionadosInfo');
    
    if (!termino || termino.length < 1) {
        resultadosDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;font-size:0.8em;padding:10px;">Escribe para buscar cartones</p>';
        mostrarCartones();
        if (cartonesSeleccionados.length === 0) {
            seleccionadosInfo.style.display = 'none';
        }
        return;
    }
    
    var terminoLower = termino.toLowerCase();
    var resultados = cartonesGenerados.filter(function(c) {
        var numStr = String(c.numero);
        var nombre = (c.asignadoA || '').toLowerCase();
        return numStr.includes(terminoLower) || nombre.includes(terminoLower);
    });
    
    mostrarCartones(termino);
    
    if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:10px;font-size:0.8em;">❌ Sin resultados para "' + termino + '"</p>';
        return;
    }
    
    resultados = resultados.slice(0, 30);
    
    resultadosDiv.innerHTML = '';
    resultados.forEach(function(c) {
        var idx = cartonesGenerados.indexOf(c);
        var estaSeleccionado = cartonesSeleccionados.indexOf(idx) !== -1;
        var div = document.createElement('div');
        div.className = 'resultado-busqueda';
        div.style.cursor = 'pointer';
        
        var checkboxHtml = '<input type="checkbox" ' + (estaSeleccionado ? 'checked' : '') + ' ';
        if (cartonesSeleccionados.length >= 2 && !estaSeleccionado) {
            checkboxHtml += 'disabled ';
        }
        checkboxHtml += 'style="width:18px;height:18px;cursor:pointer;accent-color:#10b981;" onclick="event.stopPropagation();toggleSeleccionCarton(' + idx + ', this)">';
        
        div.innerHTML = 
            '<div class="info" style="display:flex;align-items:center;gap:8px;flex:1;">' +
            checkboxHtml +
            '<strong style="color:#ffca28;">#' + c.numero + '</strong>' +
            '<span style="color:#94a3b8;font-size:0.8em;">' + (c.asignadoA ? '👤 ' + c.asignadoA : '📋 Disponible') + '</span>' +
            '</div>';
        
        div.onclick = function(e) {
            if (e.target.tagName === 'INPUT') return;
            var cartonCard = document.getElementById('cartonCard-' + idx);
            if (cartonCard) {
                cartonCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    
    actualizarInfoSeleccionados();
}

function toggleSeleccionCarton(index, checkbox) {
    var pos = cartonesSeleccionados.indexOf(index);
    
    if (pos !== -1) {
        cartonesSeleccionados.splice(pos, 1);
        checkbox.checked = false;
    } else {
        if (cartonesSeleccionados.length >= 2) {
            mostrarToast('⚠️ Máximo 2 cartones para asignar', 'error');
            checkbox.checked = false;
            return;
        }
        cartonesSeleccionados.push(index);
        checkbox.checked = true;
    }
    
    actualizarInfoSeleccionados();
    buscarCarton();
}

function actualizarInfoSeleccionados() {
    var seleccionadosInfo = document.getElementById('seleccionadosInfo');
    var countEl = document.getElementById('countSeleccionados');
    
    if (cartonesSeleccionados.length > 0) {
        seleccionadosInfo.style.display = 'block';
        var numeros = cartonesSeleccionados.map(function(idx) {
            return '#' + cartonesGenerados[idx].numero;
        }).join(', ');
        countEl.textContent = cartonesSeleccionados.length + ' (' + numeros + ')';
    } else {
        seleccionadosInfo.style.display = 'none';
    }
}

function asignarSeleccionados() {
    var nombre = document.getElementById('nombreAsignarSeleccionados').value.trim();
    
    if (!nombre) {
        mostrarToast('⚠️ Ingresa un nombre de jugador', 'error');
        return;
    }
    
    if (cartonesSeleccionados.length === 0) {
        mostrarToast('⚠️ Selecciona al menos un cartón', 'error');
        return;
    }
    
    var yaAsignados = cartonesGenerados.filter(function(c) { return c.asignadoA === nombre; }).length;
    var totalDespues = yaAsignados + cartonesSeleccionados.length;
    
    if (totalDespues > 2) {
        mostrarToast('⚠️ ' + nombre + ' ya tiene ' + yaAsignados + ' cartones. Máximo 2.', 'error');
        return;
    }
    
    cartonesSeleccionados.forEach(function(idx) {
        cartonesGenerados[idx].asignadoA = nombre;
        cartonesGenerados[idx].estado = 'asignado';
    });
    
    var count = cartonesSeleccionados.length;
    cartonesSeleccionados = [];
    
    mostrarCartones();
    actualizarContadores();
    actualizarListaJugadores();
    guardarEnFirebase();
    buscarCarton();
    document.getElementById('nombreAsignarSeleccionados').value = '';
    document.getElementById('seleccionadosInfo').style.display = 'none';
    
    mostrarToast('✅ ' + count + ' cartones asignados a ' + nombre, 'success');
}

// ============ LISTA DE JUGADORES ============
function actualizarListaJugadores() {
    var listaDiv = document.getElementById('listaJugadores');
    if (!listaDiv) return;
    
    var jugadoresMap = {};
    cartonesGenerados.forEach(function(c) {
        if (c.asignadoA) {
            if (!jugadoresMap[c.asignadoA]) {
                jugadoresMap[c.asignadoA] = [];
            }
            jugadoresMap[c.asignadoA].push(c.numero);
        }
    });
    
    var jugadores = Object.keys(jugadoresMap).sort();
    
    if (jugadores.length === 0) {
        listaDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;font-size:0.8em;padding:20px;">No hay jugadores registrados</p>';
        return;
    }
    
    listaDiv.innerHTML = '';
    jugadores.forEach(function(nombre) {
        var cartones = jugadoresMap[nombre];
        var div = document.createElement('div');
        div.className = 'jugador-item';
        div.innerHTML = 
            '<div class="jugador-info">' +
            '<span style="font-size:1.5em;">👤</span>' +
            '<div style="flex:1;min-width:0;">' +
            '<strong style="color:white;">' + nombre + '</strong>' +
            '<div style="color:#94a3b8;font-size:0.7em;">' + cartones.length + ' cartón(es): ' + cartones.map(function(n) { return '#' + n; }).join(', ') + '</div>' +
            '</div>' +
            '<button class="btn btn-link" style="font-size:0.65em;padding:5px 10px;flex:0;white-space:nowrap;" onclick="generarLinkParaJugador(\'' + nombre.replace(/'/g, "\\'") + '\')">🔗 LINK</button>' +
            '</div>';
        listaDiv.appendChild(div);
    });
}

function generarLinkParaJugador(nombre) {
    document.getElementById('nombreJugadorLink').value = nombre;
    navegarA('jugadores');
    setTimeout(function() {
        generarLinkJugador();
    }, 200);
}

// ============ CONTADORES ============
function actualizarContadores() {
    var totalEl = document.getElementById('totalCartones');
    var asignadosEl = document.getElementById('totalAsignados');
    var disponiblesEl = document.getElementById('totalDisponibles');
    var configTotal = document.getElementById('configTotal');
    var configAsignados = document.getElementById('configAsignados');
    
    var total = cartonesGenerados.length;
    var asignados = cartonesGenerados.filter(function(c) { return c.asignadoA; }).length;
    var disponibles = total - asignados;
    
    if (totalEl) totalEl.textContent = total;
    if (asignadosEl) asignadosEl.textContent = asignados;
    if (disponiblesEl) disponiblesEl.textContent = disponibles;
    if (configTotal) configTotal.textContent = total;
    if (configAsignados) configAsignados.textContent = asignados;
}

// ============ GUARDAR EN FIREBASE (AUTOMÁTICO) ============
function guardarEnFirebase() {
    if (cartonesGenerados.length === 0) {
        db.ref('salas/' + SALA_ID + '/cartones').remove().catch(function(err) {
            console.error('Error al limpiar:', err);
        });
        return;
    }
    
    var updates = {};
    cartonesGenerados.forEach(function(c) {
        updates[c.id] = {
            numero: c.numero,
            carton: c.carton,
            asignadoA: c.asignadoA || null,
            estado: c.asignadoA ? 'asignado' : 'disponible'
        };
    });
    
    db.ref('salas/' + SALA_ID + '/cartones').set(updates).then(function() {
        console.log('✅ Cartones guardados en Firebase');
    }).catch(function(err) {
        console.error('Error al guardar:', err);
    });
}

// ============ CARGAR DESDE FIREBASE (AL INICIAR) ============
function cargarDesdeFirebase() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value').then(function(snap) {
        var data = snap.val();
        if (!data) {
            console.log('📋 No hay cartones en Firebase');
            return;
        }
        
        cartonesGenerados = [];
        Object.entries(data).forEach(function(entry) {
            var id = entry[0], c = entry[1];
            if (c && c.carton) {
                cartonesGenerados.push({
                    id: id,
                    numero: c.numero || 0,
                    carton: c.carton,
                    asignadoA: c.asignadoA || null,
                    estado: c.estado || (c.asignadoA ? 'asignado' : 'disponible')
                });
            }
        });
        
        cartonesGenerados.sort(function(a, b) { return a.numero - b.numero; });
        cartonesGenerados.forEach(function(c, i) { c.numero = i + 1; });
        
        mostrarCartones();
        actualizarContadores();
        actualizarListaJugadores();
        console.log('✅ ' + cartonesGenerados.length + ' cartones cargados desde Firebase');
    }).catch(function(err) {
        console.error('Error al cargar:', err);
    });
}

// ============ EXPORTAR JSON ============
function exportarCartonesJSON() {
    if (cartonesGenerados.length === 0) {
        mostrarToast('⚠️ No hay cartones para exportar', 'error');
        return;
    }
    
    var datosExportar = cartonesGenerados.map(function(c) {
        return {
            numero: c.numero,
            carton: c.carton,
            asignadoA: c.asignadoA,
            estado: c.estado
        };
    });
    
    var data = JSON.stringify(datosExportar, null, 2);
    var blob = new Blob([data], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cartones_' + SALA_ID + '_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast('✅ ' + cartonesGenerados.length + ' cartones exportados', 'success');
}

// ============ IMPORTAR JSON ============
function importarCartonesJSON() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var data = JSON.parse(event.target.result);
                if (Array.isArray(data) && data.length > 0 && data[0].carton) {
                    if (confirm('¿Importar ' + data.length + ' cartones?\n\nEsto reemplazará los cartones actuales.')) {
                        cartonesGenerados = data.map(function(c, i) {
                            return {
                                id: 'carton_imp_' + Date.now() + '_' + i,
                                numero: i + 1,
                                carton: c.carton,
                                asignadoA: c.asignadoA || null,
                                estado: c.asignadoA ? 'asignado' : 'disponible'
                            };
                        });
                        cartonesSeleccionados = [];
                        mostrarCartones();
                        actualizarContadores();
                        actualizarListaJugadores();
                        guardarEnFirebase();
                        mostrarToast('✅ ' + data.length + ' cartones importados', 'success');
                    }
                } else {
                    mostrarToast('❌ Archivo JSON no válido', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                mostrarToast('❌ Error al leer el archivo', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============ GENERAR LINK JUGADOR ============
function generarLinkJugador() {
    var nombre = document.getElementById('nombreJugadorLink').value.trim();
    
    if (!nombre) { 
        mostrarToast('⚠️ Ingresa un nombre de jugador', 'error'); 
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
    
    var linkBox = document.getElementById('linkGenerado');
    linkBox.textContent = link;
    linkBox.style.display = 'block';
    document.getElementById('btnCopiarLink').style.display = 'block';
}

function copiarLink() {
    var link = document.getElementById('linkGenerado').textContent;
    if (!link) {
        mostrarToast('⚠️ Genera un link primero', 'error');
        return;
    }
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link copiado al portapapeles', 'success');
    }).catch(function() {
        prompt('📋 Copia este link manualmente:', link);
    });
}

// ============ COPIAR LINKS ============
function copiarLinkVerTodo() {
    var link = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'ver_todo.html?sala=' + encodeURIComponent(SALA_ID);
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link de ver_todo copiado', 'success');
    }).catch(function() {
        prompt('📋 Copia este link para ver_todo:', link);
    });
}

function copiarLinkRuleta() {
    var link = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'ruleta.html?sala=' + encodeURIComponent(SALA_ID);
    navigator.clipboard.writeText(link).then(function() {
        mostrarToast('✅ Link de ruleta copiado', 'success');
    }).catch(function() {
        prompt('📋 Copia este link para ruleta:', link);
    });
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

// ============ NAVEGACIÓN ============
function navegarA(vista) {
    // Ocultar todas las secciones
    var secciones = document.querySelectorAll('.section-panel');
    secciones.forEach(function(s) { s.classList.remove('activo'); });
    
    // Quitar activo de todos los nav
    var navs = document.querySelectorAll('.nav-item');
    navs.forEach(function(n) { n.classList.remove('activo'); });
    
    // Mostrar la seleccionada
    if (vista === 'cartones') {
        var el = document.getElementById('sectionCartones');
        if (el) el.classList.add('activo');
        var nav = document.getElementById('navCartones');
        if (nav) nav.classList.add('activo');
    } else if (vista === 'jugadores') {
        var el = document.getElementById('sectionJugadores');
        if (el) el.classList.add('activo');
        var nav = document.getElementById('navJugadores');
        if (nav) nav.classList.add('activo');
        actualizarListaJugadores();
    } else if (vista === 'config') {
        var el = document.getElementById('sectionConfig');
        if (el) el.classList.add('activo');
        var nav = document.getElementById('navConfig');
        if (nav) nav.classList.add('activo');
        actualizarContadores();
    }
}

// ============ TOAST ============
function mostrarToast(mensaje, tipo) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = mensaje;
    toast.className = 'toast ' + (tipo || '');
    toast.offsetHeight;
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}
