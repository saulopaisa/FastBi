// generar.js - Versión Final con Cartones Únicos

const SALA_ID = localStorage.getItem('salaActiva') || ('sala-' + Date.now());
localStorage.setItem('salaActiva', SALA_ID);

let seleccionados = new Set();

// Registro de posiciones para limitar a 2 cartones por número/posición
const registroPosiciones = {};

console.log('📁 Sala ID:', SALA_ID);

db.ref('.info/connected').on('value', function(snap) {
    console.log(snap.val() ? '🟢 Conectado a Firebase' : '🔴 Desconectado');
});

// ============ INICIALIZAR REGISTRO DE POSICIONES ============
function inicializarRegistro() {
    ['B','I','N','G','O'].forEach(function(letra) {
        for (let f = 0; f < 5; f++) {
            const key = letra + '-' + f;
            if (!registroPosiciones[key]) registroPosiciones[key] = {};
        }
    });
}

function contarEnPosicion(letra, fila, valor) {
    const key = letra + '-' + fila;
    if (!registroPosiciones[key]) registroPosiciones[key] = {};
    return registroPosiciones[key][valor] || 0;
}

function registrarPosicion(letra, fila, valor) {
    const key = letra + '-' + fila;
    if (!registroPosiciones[key]) registroPosiciones[key] = {};
    registroPosiciones[key][valor] = (registroPosiciones[key][valor] || 0) + 1;
}

function cargarRegistroDesdeFirebase(callback) {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        inicializarRegistro();
        snap.forEach(function(child) {
            const c = child.val();
            if (c.carton) {
                ['B','I','N','G','O'].forEach(function(letra) {
                    c.carton[letra].forEach(function(valor, fila) {
                        if (!(letra === 'N' && fila === 2)) {
                            registrarPosicion(letra, fila, valor);
                        }
                    });
                });
            }
        });
        if (callback) callback();
    });
}

// ============ GENERAR COLUMNA (CON LÍMITE DE 2 POR POSICIÓN) ============
function generarColumna(min, max, letra, fila) {
    const disponibles = [];
    for (let n = min; n <= max; n++) {
        const count = contarEnPosicion(letra, fila, n);
        if (count < 2) disponibles.push(n);
    }
    
    // Si hay menos de 5 disponibles, liberar todos
    if (disponibles.length < 5) {
        disponibles.length = 0;
        for (let n = min; n <= max; n++) disponibles.push(n);
    }
    
    // Barajar y tomar 5
    for (let i = disponibles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]];
    }
    
    const seleccionados = disponibles.slice(0, 5).sort((a, b) => a - b);
    
    // Registrar posiciones (excepto centro)
    seleccionados.forEach(function(valor, idx) {
        if (!(letra === 'N' && idx === 2)) {
            registrarPosicion(letra, idx, valor);
        }
    });
    
    return seleccionados;
}

// ============ GENERAR CARTÓN ============
function generarCarton() {
    const columnas = {};
    const letras = ['B','I','N','G','O'];
    
    letras.forEach(function(letra) {
        let min, max;
        if (letra === 'B') { min = 1; max = 15; }
        else if (letra === 'I') { min = 16; max = 30; }
        else if (letra === 'N') { min = 31; max = 45; }
        else if (letra === 'G') { min = 46; max = 60; }
        else { min = 61; max = 75; }
        
        columnas[letra] = generarColumna(min, max, letra, 0);
    });
    
    columnas.N[2] = 'FREE';
    return columnas;
}

// ============ GENERAR LINK CIFRADO ============
function generarLinkCifrado(nombre, ids) {
    const base = location.origin + location.pathname.replace('generar.html', '');
    const datos = { n: nombre, c: ids, s: SALA_ID, t: Date.now() };
    return base + 'jugador.html?d=' + btoa(encodeURIComponent(JSON.stringify(datos)));
}

// ============ MOSTRAR LISTA ============
function mostrarLista() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        document.getElementById('contadorRegistrados').innerHTML = '🎫 CARTONES: ' + total;
        const contenedor = document.getElementById('listaCartones');
        contenedor.innerHTML = '';
        if (total === 0) { contenedor.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No hay cartones</p>'; actualizarBtnAsignar(); return; }
        const cartones = [];
        snap.forEach(function(child) { cartones.push({ key: child.key, data: child.val() }); });
        cartones.sort((a, b) => (a.data.numero || 0) - (b.data.numero || 0));
        cartones.forEach(function(item) {
            const c = item.data, id = item.key, sel = seleccionados.has(id);
            const div = document.createElement('div');
            div.className = 'card-carton'; div.setAttribute('data-id', id);
            if (sel) div.classList.add('seleccionado');
            div.onclick = function(e) { if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return; verPreview(id); };
            div.innerHTML = '<div class="carton-header"><span class="carton-id"># ' + (c.numero||'?') + '</span><span class="carton-estado estado-' + (c.estado||'disponible') + '">' + (c.estado||'disponible') + '</span></div>' +
                (c.asignadoA ? '<div class="carton-asignado">👤 ' + c.asignadoA + '</div>' : '') +
                '<input type="text" class="input-nombre-carton" value="' + (c.nombre||'') + '" onchange="renombrarCarton(\'' + id + '\', this.value)" onclick="event.stopPropagation()" placeholder="Nombre...">' +
                '<div class="carton-acciones"><button class="btn-accion-pequeno seleccionar' + (sel?' activo':'') + '" onclick="event.stopPropagation(); toggleSeleccion(\'' + id + '\')">' + (sel?'✓':'○') + '</button>' +
                '<button class="btn-accion-pequeno link" onclick="event.stopPropagation(); copiarLink(\'' + id + '\')">🔗</button>' +
                '<button class="btn-accion-pequeno estado-btn" onclick="event.stopPropagation(); cambiarEstado(\'' + id + '\')">🔄</button>' +
                '<button class="btn-accion-pequeno eliminar" onclick="event.stopPropagation(); eliminarCarton(\'' + id + '\')">🗑️</button></div>';
            contenedor.appendChild(div);
        });
        actualizarBtnAsignar();
    });
}

function actualizarBtnAsignar() {
    const btn = document.getElementById('btnAsignar');
    if (btn) { btn.textContent = seleccionados.size > 0 ? '👤 ASIGNAR (' + seleccionados.size + ' cartones)' : '👤 ASIGNAR A JUGADOR'; btn.style.display = seleccionados.size > 0 ? 'block' : 'none'; }
}

function toggleSeleccion(id) { if (seleccionados.has(id)) seleccionados.delete(id); else seleccionados.add(id); mostrarLista(); }

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar'), cantidad = parseInt(input.value) || 1;
    if (cantidad < 1 || cantidad > 100) { alert('1-100'); return; }
    
    mostrarToast('⏳ Generando ' + cantidad + ' cartones...');
    
    cargarRegistroDesdeFirebase(function() {
        db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
            let maxNum = 0;
            snap.forEach(function(c) { const n = c.val().numero || 0; if (n > maxNum) maxNum = n; });
            
            let creados = 0;
            for (let i = 0; i < cantidad; i++) {
                const nuevoNum = maxNum + i + 1;
                const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2,5);
                const carton = generarCarton();
                
                db.ref('salas/' + SALA_ID + '/cartones/' + id).set({
                    id, numero: nuevoNum, nombre: 'Cartón ' + nuevoNum,
                    carton: carton, estado: 'disponible', asignadoA: '', creado: Date.now()
                }, function(error) {
                    if (!error) {
                        creados++;
                        if (creados === cantidad) {
                            mostrarLista();
                            input.value = '';
                            mostrarToast('✅ ' + cantidad + ' cartones generados');
                        }
                    }
                });
            }
        });
    });
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    if (seleccionados.size === 0) { alert('Selecciona cartones'); return; }
    if (seleccionados.size > 4) { alert('Máximo 4'); return; }
    const nombre = prompt('👤 Nombre:');
    if (!nombre || !nombre.trim()) return;
    const nj = nombre.trim(), ids = Array.from(seleccionados);
    let comp = 0;
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ estado: 'asignado', asignadoA: nj }, function(error) {
            if (!error) { comp++; if (comp === ids.length) { seleccionados.clear(); mostrarLista(); mostrarAsignacionExitosa(nj, ids, generarLinkCifrado(nj, ids)); } }
        });
    });
}

function mostrarAsignacionExitosa(nombre, ids, link) {
    const preview = document.getElementById('vista-previa-contenido');
    preview.innerHTML = '<div style="padding:20px;"><h2 style="color:#10b981;">✅ Asignado</h2><h3>👤 ' + nombre + '</h3><p>' + ids.length + ' cart.</p>' +
        '<div style="background:#f1f5f9;padding:15px;border-radius:8px;margin:15px 0;"><input id="linkJugadorInput" value="' + link + '" readonly style="width:100%;padding:10px;border:2px solid #3b82f6;border-radius:6px;margin-bottom:10px;" onclick="this.select()">' +
        '<button id="btnCopiarLink" style="background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">📋 COPIAR LINK</button></div>' +
        '<button onclick="exportarPDFPorJugador(\'' + nombre.replace(/'/g,"\\'") + '\')" style="background:#8b5cf6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;">📄 PDF de ' + nombre + '</button></div>';
    document.getElementById('btnCopiarLink').addEventListener('click', function() {
        const inp = document.getElementById('linkJugadorInput'); inp.select(); navigator.clipboard.writeText(inp.value);
        this.textContent = '✅ COPIADO!'; this.style.background = '#10b981';
        setTimeout(() => { this.textContent = '📋 COPIAR LINK'; this.style.background = '#3b82f6'; }, 2000);
    });
}

// ============ VISTA PREVIA ============
function verPreview(id) {
    const preview = document.getElementById('vista-previa-contenido');
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val(); if (!d || !d.carton) return;
        let h = '<div style="padding:15px;"><h3>Cartón #' + d.numero + '</h3>';
        if (d.asignadoA) h += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        h += '<table style="width:100%;border-collapse:collapse;max-width:300px;margin:10px auto;"><tr style="background:#ff4d4d;color:white;"><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
        for (let f=0;f<5;f++) { h+='<tr>'; ['B','I','N','G','O'].forEach(function(l){ const v=d.carton[l][f],c=(l==='N'&&f===2); h+='<td style="padding:8px;border:2px solid #e2e8f0;text-align:center;'+(c?'background:#fef3c7;':'')+'">'+(c?'⭐':v)+'</td>'; }); h+='</tr>'; }
        h += '</table></div>'; preview.innerHTML = h;
    });
}

// ============ AUXILIARES ============
function renombrarCarton(id, n) { if (n && n.trim()) db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: n.trim() }); }
function cambiarEstado(id) { db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) { const e=['disponible','asignado','usado']; const a=e.indexOf(snap.val().estado||'disponible'); db.ref('salas/' + SALA_ID + '/cartones/' + id).update({estado:e[(a+1)%3]},function(){mostrarLista();verPreview(id);}); }); }
function copiarLink(id) { navigator.clipboard.writeText(generarLinkCifrado('Cartón individual', [id])).then(() => mostrarToast('✅ Link copiado')); }
function eliminarCarton(id) { if (confirm('¿Eliminar?')) { seleccionados.delete(id); db.ref('salas/' + SALA_ID + '/cartones/' + id).remove(() => mostrarLista()); } }
function borrarTodo() { if (confirm('⚠️ ¿Eliminar TODOS?')) { seleccionados.clear(); db.ref('salas/' + SALA_ID + '/cartones').remove(() => { document.getElementById('vista-previa-contenido').innerHTML = '<div class="preview-empty"><h2>✅ Eliminados</h2></div>'; mostrarLista(); }); } }
function exportarJSON() { db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) { const d={sala:SALA_ID,cartones:snap.val()||{}}; const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='cartones-'+SALA_ID+'.json'; a.click(); mostrarToast('💾 Exportado'); }); }
function importarJSON(e) { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=function(ev){const d=JSON.parse(ev.target.result);if(d.cartones){db.ref('salas/'+SALA_ID+'/cartones').set(d.cartones,()=>{mostrarLista();mostrarToast('✅ Importado');});}}; r.readAsText(f); }
function verJugadores() { const p=document.getElementById('vista-previa-contenido'); db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){const j={};snap.forEach(function(c){const v=c.val();if(v.asignadoA){if(!j[v.asignadoA])j[v.asignadoA]=[];j[v.asignadoA].push({id:v.id,numero:v.numero});}});if(Object.keys(j).length===0){p.innerHTML='<div class="preview-empty"><h3>👥 No hay jugadores</h3></div>';return;}let h='<h3 style="color:#ff4d4d;">👥 JUGADORES</h3><div style="max-height:60vh;overflow-y:auto;">';Object.keys(j).forEach(function(n){const c=j[n],ids=c.map(x=>x.id),l=generarLinkCifrado(n,ids);h+='<div style="background:#f1f5f9;padding:10px;margin:5px 0;border-radius:8px;text-align:left;"><strong>👤 '+n+'</strong> - '+c.length+' cart.<div style="display:flex;gap:5px;margin-top:5px;"><input value="'+l+'" readonly style="flex:1;padding:5px;font-size:0.75rem;" onclick="this.select()"><button onclick="navigator.clipboard.writeText(\''+l+'\');mostrarToast(\'✅ Copiado\')" style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">📋</button><button onclick="exportarPDFPorJugador(\''+n.replace(/'/g,"\\'")+'\')" style="background:#8b5cf6;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">📄</button></div></div>';});h+='</div>';p.innerHTML=h;}); }
function verLinks() { const p=document.getElementById('vista-previa-contenido'); db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){if(!snap.exists()){p.innerHTML='<div class="preview-empty"><h3>📋 Sin cartones</h3></div>';return;}let h='<h3 style="color:#ff4d4d;">🔗 LINKS</h3><div style="max-height:60vh;overflow-y:auto;text-align:left;">';snap.forEach(function(c){const v=c.val(),l=generarLinkCifrado(v.asignadoA||'Cartón #'+v.numero,[v.id]);h+='<div style="background:#f1f5f9;padding:8px;margin:4px 0;border-radius:6px;"><strong>#'+v.numero+'</strong>'+(v.asignadoA?' ('+v.asignadoA+')':'')+'<input value="'+l+'" readonly style="width:100%;padding:4px;margin-top:4px;font-size:0.75rem;" onclick="this.select()"></div>';});h+='</div>';p.innerHTML=h;}); }
function seleccionarTodos() { const c=document.querySelectorAll('.card-carton'); const t=Array.from(c).every(x=>x.classList.contains('seleccionado')); c.forEach(function(x){const id=x.getAttribute('data-id');if(t)seleccionados.delete(id);else seleccionados.add(id);}); mostrarLista(); }
function filtrarCartones(t) { document.querySelectorAll('.card-carton').forEach(c => c.style.display = c.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none'); }
function mostrarToast(m) { const t=document.querySelector('.toast');if(t)t.remove();const toast=document.createElement('div');toast.className='toast';toast.textContent=m;document.body.appendChild(toast);setTimeout(()=>{if(toast.parentNode)toast.remove();},2000); }

// ============ PDF ============
function getPDFStyles() {
    return `*{margin:0;padding:0;box-sizing:border-box}@page{size:letter;margin:8mm}body{font-family:Arial,sans-serif;background:white;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pagina{width:100%;max-width:100%;margin:0 auto;padding:5px;background:white;page-break-after:always;min-height:100vh;display:flex;flex-direction:column;justify-content:space-evenly}.pagina:last-child{page-break-after:avoid}h1{text-align:center;color:#ff4d4d;font-size:22px;margin:0;padding:0}h2{text-align:center;color:#1e293b;font-size:16px;margin:0;padding:0}.info{text-align:center;color:#64748b;font-size:10px;margin-bottom:8px}.carton{border:3px solid #000;border-radius:10px;padding:12px 15px;background:white;width:100%;flex:1;display:flex;flex-direction:column;justify-content:center}table{width:100%;border-collapse:collapse}th{background:#ff4d4d!important;color:white!important;padding:14px 8px;font-size:18px;border:2px solid #000}td{padding:16px 8px;border:2px solid #000;text-align:center;font-weight:bold;font-size:22px}.free{background:#fef3c7!important;font-size:26px}.num-carton{text-align:center;margin-bottom:8px}.num-carton span{background:#ff4d4d!important;color:white!important;padding:5px 18px;border-radius:15px;font-size:15px;font-weight:bold}.jugador{text-align:center;color:#10b981;margin:5px 0;font-size:14px;font-weight:bold}@media print{body{margin:0;padding:0}.pagina{page-break-after:always;min-height:auto;height:100vh}.pagina:last-child{page-break-after:avoid}}`;
}
function htmlCartonPDF(c) { if(!c||!c.carton)return'<div class="carton"><p>Error</p></div>';const ca=c.carton,n=c.numero||'?',a=c.asignadoA||'';let h='<div class="carton"><div class="num-carton"><span>Cartón #'+n+'</span></div>';if(a)h+='<p class="jugador">👤 '+a+'</p>';h+='<table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';for(let f=0;f<5;f++){h+='<tr>';['B','I','N','G','O'].forEach(function(l){const v=ca[l]?ca[l][f]:'?',c=(l==='N'&&f===2);h+='<td class="'+(c?'free':'')+'">'+(c?'⭐':v)+'</td>';});h+='</tr>';}h+='</table></div>';return h;}
function exportarPDFTodos(){db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){if(!snap.exists()){alert('No hay cartones');return}const c=[];snap.forEach(function(ch){c.push(ch.val())});c.sort((a,b)=>(a.numero||0)-(b.numero||0));abrirVentanaImpresion(c,'Todos los Cartones')})}
function exportarPDFPorJugador(nj){db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){const c=[];snap.forEach(function(ch){if(ch.val().asignadoA===nj)c.push(ch.val())});if(c.length===0){alert('No hay cartones para: '+nj);return}c.sort((a,b)=>(a.numero||0)-(b.numero||0));abrirVentanaImpresion(c,'👤 '+nj)})}
function abrirVentanaImpresion(cartones,titulo){const v=window.open('','_blank','width=800,height=600');v.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bingo - '+titulo+'</title><style>'+getPDFStyles()+'</style></head><body>');for(let i=0;i<cartones.length;i+=2){v.document.write('<div class="pagina"><h1>🎯 BINGO PRO</h1><h2>'+titulo+'</h2><p class="info">Página '+(Math.floor(i/2)+1)+' | '+cartones.length+' cartones | '+new Date().toLocaleDateString()+'</p>');v.document.write(htmlCartonPDF(cartones[i]));if(i+1<cartones.length)v.document.write(htmlCartonPDF(cartones[i+1]));v.document.write('</div>')}v.document.write('<script>window.onload=function(){setTimeout(function(){window.print()},800)};<\/script></body></html>');v.document.close();mostrarToast('✅ Selecciona "Guardar como PDF"')}
function abrirMenuPDF(){const p=document.getElementById('vista-previa-contenido');if(!p)return;db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){const t=snap.numChildren()||0,j=new Set();snap.forEach(function(c){if(c.val().asignadoA)j.add(c.val().asignadoA)});let h='<div style="padding:20px;"><h2 style="color:#ff4d4d;text-align:center;">📄 EXPORTAR PDF</h2><p style="color:#64748b;text-align:center;font-size:0.8rem;">Se abrirá una ventana. Selecciona "Guardar como PDF"</p>';h+='<button onclick="exportarPDFTodos()" style="width:100%;padding:15px;background:#ff4d4d;color:white;border:none;border-radius:10px;cursor:pointer;font-size:1.1rem;font-weight:bold;margin-bottom:20px;">📄 TODOS ('+t+')</button>';if(j.size>0){h+='<h3>👤 Por Jugador</h3><div style="max-height:50vh;overflow-y:auto;">';j.forEach(function(n){let c=0;snap.forEach(function(ch){if(ch.val().asignadoA===n)c++});h+='<div style="background:#f1f5f9;padding:12px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;"><div><strong>👤 '+n+'</strong><br><span>'+c+' cart.</span></div><button onclick="exportarPDFPorJugador(\''+n.replace(/'/g,"\\'")+'\')" style="background:#8b5cf6;color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;">📄 PDF</button></div>'});h+='</div>'}else{h+='<p style="color:#94a3b8;text-align:center;">No hay jugadores asignados</p>'}h+='</div>';p.innerHTML=h})}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bingo Pro Admin - Cartones Únicos');
    inicializarRegistro();
    cargarRegistroDesdeFirebase();
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', () => document.getElementById('fileIn').click());
    document.getElementById('btnPDF').addEventListener('click', abrirMenuPDF);
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnJugadores').addEventListener('click', verJugadores);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', () => location.href = 'ruleta.html');
    const ba = document.getElementById('btnAsignar'); if (ba) ba.addEventListener('click', asignarAJugador);
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', e => filtrarCartones(e.target.value));
    document.getElementById('cantidadGenerar').addEventListener('keypress', e => { if (e.key === 'Enter') generarLote(); });
    mostrarLista();
});
