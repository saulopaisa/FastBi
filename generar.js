// generar.js - Versión Final

const SALA_ID = localStorage.getItem('salaActiva') || ('sala-' + Date.now());
localStorage.setItem('salaActiva', SALA_ID);

let seleccionados = new Set();

console.log('📁 Sala ID:', SALA_ID);

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

function toggleSeleccion(id) {
    if (seleccionados.has(id)) { seleccionados.delete(id); }
    else { seleccionados.add(id); }
    mostrarLista();
}

// ============ GENERAR LOTE ============
function generarLote() {
    const input = document.getElementById('cantidadGenerar');
    const cantidad = parseInt(input.value) || 1;
    if (cantidad < 1 || cantidad > 100) { alert('1-100'); return; }
    
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        let maxNum = 0;
        snap.forEach(function(child) { const n = child.val().numero || 0; if (n > maxNum) maxNum = n; });
        let creados = 0;
        for (let i = 0; i < cantidad; i++) {
            const nuevoNum = maxNum + i + 1;
            const id = 'c-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2,5);
            db.ref('salas/' + SALA_ID + '/cartones/' + id).set({
                id, numero: nuevoNum, nombre: 'Cartón ' + nuevoNum,
                carton: generarCarton(), estado: 'disponible', asignadoA: '', creado: Date.now()
            }, function(error) {
                if (!error) { creados++; if (creados === cantidad) { mostrarLista(); input.value = ''; } }
            });
        }
    });
}

// ============ ASIGNAR A JUGADOR ============
function asignarAJugador() {
    if (seleccionados.size === 0) { alert('Selecciona cartones'); return; }
    if (seleccionados.size > 4) { alert('Máximo 4'); return; }
    const nombre = prompt('Nombre del jugador:');
    if (!nombre || !nombre.trim()) return;
    const nj = nombre.trim();
    const ids = Array.from(seleccionados);
    let comp = 0;
    ids.forEach(function(id) {
        db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ estado: 'asignado', asignadoA: nj }, function(error) {
            if (!error) { comp++; if (comp === ids.length) { seleccionados.clear(); mostrarLista(); mostrarAsignacionExitosa(nj, ids, generarLinkJugador(nj, ids)); } }
        });
    });
}

function generarLinkJugador(nombre, ids) {
    return location.origin + location.pathname.replace('generar.html', '') + 'jugador.html?nombre=' + encodeURIComponent(nombre) + '&cartones=' + ids.join(',') + '&sala=' + SALA_ID;
}

function mostrarAsignacionExitosa(nombre, ids, link) {
    const preview = document.getElementById('vista-previa-contenido');
    preview.innerHTML = '<div style="padding:20px;"><h2 style="color:#10b981;">✅ ¡Asignado!</h2><h3>👤 ' + nombre + '</h3><p>' + ids.length + ' cartón(es)</p><div style="background:#f1f5f9;padding:15px;border-radius:8px;margin:15px 0;"><input id="linkJugadorInput" value="' + link + '" readonly style="width:100%;padding:10px;border:2px solid #3b82f6;border-radius:6px;margin-bottom:10px;" onclick="this.select()"><button id="btnCopiarLink" style="background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">📋 COPIAR LINK</button></div><button onclick="exportarPDFPorJugador(\'' + nombre.replace(/'/g,"\\'") + '\')" style="background:#8b5cf6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;">📄 PDF de ' + nombre + '</button></div>';
    document.getElementById('btnCopiarLink').addEventListener('click', function() {
        const inp = document.getElementById('linkJugadorInput'); inp.select(); navigator.clipboard.writeText(inp.value); this.textContent = '✅ COPIADO!'; this.style.background = '#10b981';
    });
}

// ============ VISTA PREVIA ============
function verPreview(id) {
    db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) {
        const d = snap.val(); if (!d || !d.carton) return;
        let h = '<div style="padding:15px;"><h3>Cartón #' + d.numero + '</h3>';
        if (d.asignadoA) h += '<p style="color:#10b981;">👤 ' + d.asignadoA + '</p>';
        h += '<table style="width:100%;border-collapse:collapse;max-width:300px;margin:10px auto;"><tr style="background:#ff4d4d;color:white;"><th style="padding:8px;">B</th><th style="padding:8px;">I</th><th style="padding:8px;">N</th><th style="padding:8px;">G</th><th style="padding:8px;">O</th></tr>';
        for (let f=0;f<5;f++) { h+='<tr>'; ['B','I','N','G','O'].forEach(function(l){ const v=d.carton[l][f]; const c=(l==='N'&&f===2); h+='<td style="padding:8px;border:2px solid #e2e8f0;text-align:center;'+(c?'background:#fef3c7;':'')+'">'+(c?'⭐':v)+'</td>'; }); h+='</tr>'; }
        h += '</table></div>';
        document.getElementById('vista-previa-contenido').innerHTML = h;
    });
}

// ============ AUXILIARES ============
function renombrarCarton(id, nombre) { if (nombre && nombre.trim()) db.ref('salas/' + SALA_ID + '/cartones/' + id).update({ nombre: nombre.trim() }); }
function cambiarEstado(id) { db.ref('salas/' + SALA_ID + '/cartones/' + id).once('value', function(snap) { const e=['disponible','asignado','usado']; const a=e.indexOf(snap.val().estado||'disponible'); db.ref('salas/' + SALA_ID + '/cartones/' + id).update({estado:e[(a+1)%3]},function(){mostrarLista();verPreview(id);}); }); }
function copiarLink(id) { navigator.clipboard.writeText(location.origin+location.pathname.replace('generar.html','')+'carton.html?carton='+id+'&sala='+SALA_ID).then(function(){mostrarToast('✅ Link copiado');}); }
function eliminarCarton(id) { if(confirm('¿Eliminar?')){seleccionados.delete(id);db.ref('salas/'+SALA_ID+'/cartones/'+id).remove(function(){mostrarLista();});} }
function borrarTodo() { if(confirm('⚠️ ¿Eliminar TODOS?')){seleccionados.clear();db.ref('salas/'+SALA_ID+'/cartones').remove(function(){document.getElementById('vista-previa-contenido').innerHTML='<div class="preview-empty"><h2>✅ Eliminados</h2></div>';mostrarLista();});} }
function exportarJSON() { db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){const d={sala:SALA_ID,cartones:snap.val()||{}};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cartones-'+SALA_ID+'.json';a.click();mostrarToast('💾 Exportado');}); }
function importarJSON(e) { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=function(ev){const d=JSON.parse(ev.target.result);if(d.cartones){db.ref('salas/'+SALA_ID+'/cartones').set(d.cartones,function(){mostrarLista();mostrarToast('✅ Importado');});}}; r.readAsText(f); }
function verJugadores() { const p=document.getElementById('vista-previa-contenido'); db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){const j={};snap.forEach(function(c){const v=c.val();if(v.asignadoA){if(!j[v.asignadoA])j[v.asignadoA]=[];j[v.asignadoA].push({id:v.id,numero:v.numero});}});if(Object.keys(j).length===0){p.innerHTML='<div class="preview-empty"><h3>👥 No hay jugadores</h3></div>';return;}let h='<h3 style="color:#ff4d4d;">👥 JUGADORES</h3><div style="max-height:60vh;overflow-y:auto;">';Object.keys(j).forEach(function(n){const c=j[n];const ids=c.map(function(x){return x.id;});const l=generarLinkJugador(n,ids);h+='<div style="background:#f1f5f9;padding:10px;margin:5px 0;border-radius:8px;text-align:left;"><strong>👤 '+n+'</strong> - '+c.length+' cart.<div style="display:flex;gap:5px;margin-top:5px;"><input value="'+l+'" readonly style="flex:1;padding:5px;font-size:0.75rem;" onclick="this.select()"><button onclick="navigator.clipboard.writeText(\''+l+'\');mostrarToast(\'✅ Copiado\')" style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">📋</button><button onclick="exportarPDFPorJugador(\''+n.replace(/'/g,"\\'")+'\')" style="background:#8b5cf6;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">📄</button></div></div>';});h+='</div>';p.innerHTML=h;}); }
function verLinks() { const p=document.getElementById('vista-previa-contenido'); db.ref('salas/'+SALA_ID+'/cartones').once('value',function(snap){if(!snap.exists()){p.innerHTML='<div class="preview-empty"><h3>📋 Sin cartones</h3></div>';return;}let h='<h3 style="color:#ff4d4d;">🔗 LINKS</h3><div style="max-height:60vh;overflow-y:auto;text-align:left;">';const b=location.origin+location.pathname.replace('generar.html','');snap.forEach(function(c){const v=c.val();const l=b+'carton.html?carton='+v.id+'&sala='+SALA_ID;h+='<div style="background:#f1f5f9;padding:8px;margin:4px 0;border-radius:6px;"><strong>#'+v.numero+'</strong>'+(v.asignadoA?' ('+v.asignadoA+')':'')+'<input value="'+l+'" readonly style="width:100%;padding:4px;margin-top:4px;font-size:0.75rem;" onclick="this.select()"></div>';});h+='</div>';p.innerHTML=h;}); }
function seleccionarTodos() { const c=document.querySelectorAll('.card-carton'); const t=Array.from(c).every(function(x){return x.classList.contains('seleccionado');}); c.forEach(function(x){const id=x.getAttribute('data-id');if(t){seleccionados.delete(id);}else{seleccionados.add(id);}}); mostrarLista(); }
function filtrarCartones(t) { document.querySelectorAll('.card-carton').forEach(function(c){c.style.display=c.textContent.toLowerCase().includes(t.toLowerCase())?'':'none';}); }
function mostrarToast(m) { const t=document.querySelector('.toast');if(t)t.remove();const toast=document.createElement('div');toast.className='toast';toast.textContent=m;document.body.appendChild(toast);setTimeout(function(){if(toast.parentNode)toast.remove();},2000); }

// ============ HTML CARTÓN PDF ============
function htmlCartonPDF(c) {
    if (!c || !c.carton) return '<div class="carton"><p>Error</p></div>';
    const carton = c.carton, num = c.numero || '?', asig = c.asignadoA || '';
    let h = '<div class="carton"><div class="num-carton"><span>Cartón #' + num + '</span></div>';
    if (asig) h += '<p class="jugador">👤 ' + asig + '</p>';
    h += '<table><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';
    for (let f=0;f<5;f++) { h+='<tr>'; ['B','I','N','G','O'].forEach(function(l){ const v=carton[l]?carton[l][f]:'?'; const centro=(l==='N'&&f===2); h+='<td class="'+(centro?'free':'')+'">'+(centro?'⭐':v)+'</td>'; }); h+='</tr>'; }
    h += '</table></div>';
    return h;
}

// ============ EXPORTAR PDF - TODOS ============
function exportarPDFTodos() {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        if (!snap.exists()) { alert('No hay cartones'); return; }
        const cartones = [];
        snap.forEach(function(c) { cartones.push(c.val()); });
        cartones.sort((a,b) => (a.numero||0)-(b.numero||0));
        
        const w = window.open('', '_blank', 'width=800,height=1050');
        w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF</title>');
        w.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>');
        w.document.write('<style>');
        w.document.write('*{margin:0;padding:0;box-sizing:border-box}');
        w.document.write('body{font-family:Arial;background:white}');
        w.document.write('.pagina{width:750px;padding:15px 20px;background:white;page-break-after:always;height:1000px;overflow:hidden}');
        w.document.write('.pagina:last-child{page-break-after:avoid}');
        w.document.write('h1{text-align:center;color:#ff4d4d;font-size:18px;margin:0 0 3px}');
        w.document.write('h2{text-align:center;color:#1e293b;font-size:15px;margin:0 0 3px}');
        w.document.write('.info{text-align:center;color:#64748b;font-size:11px;margin-bottom:10px}');
        w.document.write('.carton{border:3px solid #000;border-radius:10px;padding:12px 15px;background:white;margin-bottom:15px}');
        w.document.write('table{width:100%;border-collapse:collapse}');
        w.document.write('th{background:#ff4d4d;color:white;padding:12px;font-size:18px;border:2px solid #000}');
        w.document.write('td{padding:14px;border:2px solid #000;text-align:center;font-weight:bold;font-size:22px}');
        w.document.write('.free{background:#fef3c7;font-size:26px}');
        w.document.write('.num-carton{text-align:center;margin-bottom:6px}');
        w.document.write('.num-carton span{background:#ff4d4d;color:white;padding:4px 18px;border-radius:12px;font-size:14px;font-weight:bold}');
        w.document.write('.jugador{text-align:center;color:#10b981;margin:4px 0;font-size:14px;font-weight:bold}');
        w.document.write('</style></head><body>');
        
        for (let i=0;i<cartones.length;i+=2) {
            w.document.write('<div class="pagina"><h1>🎯 BINGO PRO</h1><h2>Todos los Cartones</h2><p class="info">Pág. '+(Math.floor(i/2)+1)+' | '+cartones.length+' cartones</p>');
            w.document.write(htmlCartonPDF(cartones[i]));
            if (i+1 < cartones.length) w.document.write(htmlCartonPDF(cartones[i+1]));
            w.document.write('</div>');
        }
        w.document.write('</body></html>');
        w.document.close();
        
        setTimeout(function() {
            w.html2pdf().set({
                margin: 0,
                filename: 'todos-cartones-bingo.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            }).from(w.document.body).save().then(function() {
                mostrarToast('✅ PDF generado');
                setTimeout(function() { w.close(); }, 1000);
            }).catch(function(err) {
                console.error(err);
                alert('Error: ' + err.message);
                w.close();
            });
        }, 2000);
    });
}

// ============ EXPORTAR PDF POR JUGADOR ============
function exportarPDFPorJugador(nombreJugador) {
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const cartonesJ = [];
        snap.forEach(function(c) { if (c.val().asignadoA === nombreJugador) cartonesJ.push(c.val()); });
        if (cartonesJ.length === 0) { alert('No hay cartones para: ' + nombreJugador); return; }
        cartonesJ.sort((a,b) => (a.numero||0)-(b.numero||0));
        
        const w = window.open('', '_blank', 'width=800,height=1050');
        w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF</title>');
        w.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>');
        w.document.write('<style>');
        w.document.write('*{margin:0;padding:0;box-sizing:border-box}');
        w.document.write('body{font-family:Arial;background:white}');
        w.document.write('.pagina{width:750px;padding:15px 20px;background:white;page-break-after:always;height:1000px;overflow:hidden}');
        w.document.write('.pagina:last-child{page-break-after:avoid}');
        w.document.write('h1{text-align:center;color:#ff4d4d;font-size:18px;margin:0 0 3px}');
        w.document.write('h2{text-align:center;color:#1e293b;font-size:15px;margin:0 0 3px}');
        w.document.write('.info{text-align:center;color:#64748b;font-size:11px;margin-bottom:10px}');
        w.document.write('.carton{border:3px solid #000;border-radius:10px;padding:12px 15px;background:white;margin-bottom:15px}');
        w.document.write('table{width:100%;border-collapse:collapse}');
        w.document.write('th{background:#ff4d4d;color:white;padding:12px;font-size:18px;border:2px solid #000}');
        w.document.write('td{padding:14px;border:2px solid #000;text-align:center;font-weight:bold;font-size:22px}');
        w.document.write('.free{background:#fef3c7;font-size:26px}');
        w.document.write('.num-carton{text-align:center;margin-bottom:6px}');
        w.document.write('.num-carton span{background:#ff4d4d;color:white;padding:4px 18px;border-radius:12px;font-size:14px;font-weight:bold}');
        w.document.write('</style></head><body>');
        
        for (let i=0;i<cartonesJ.length;i+=2) {
            w.document.write('<div class="pagina"><h1>🎯 BINGO PRO</h1><h2>👤 '+nombreJugador+'</h2><p class="info">Pág. '+(Math.floor(i/2)+1)+' | '+cartonesJ.length+' cartones</p>');
            w.document.write(htmlCartonPDF(cartonesJ[i]));
            if (i+1 < cartonesJ.length) w.document.write(htmlCartonPDF(cartonesJ[i+1]));
            w.document.write('</div>');
        }
        w.document.write('</body></html>');
        w.document.close();
        
        setTimeout(function() {
            w.html2pdf().set({
                margin: 0,
                filename: 'cartones-'+nombreJugador.replace(/\s+/g,'-')+'.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            }).from(w.document.body).save().then(function() {
                mostrarToast('✅ PDF generado');
                setTimeout(function() { w.close(); }, 1000);
            }).catch(function(err) {
                console.error(err);
                alert('Error: ' + err.message);
                w.close();
            });
        }, 2000);
    });
}

// ============ MENÚ PDF ============
function abrirMenuPDF() {
    const preview = document.getElementById('vista-previa-contenido');
    if (!preview) return;
    db.ref('salas/' + SALA_ID + '/cartones').once('value', function(snap) {
        const total = snap.numChildren() || 0;
        const jugadores = new Set();
        snap.forEach(function(c) { if (c.val().asignadoA) jugadores.add(c.val().asignadoA); });
        let h = '<div style="padding:20px;"><h2 style="color:#ff4d4d;text-align:center;">📄 EXPORTAR PDF</h2>';
        h += '<button onclick="exportarPDFTodos()" style="width:100%;padding:15px;background:#ff4d4d;color:white;border:none;border-radius:10px;cursor:pointer;font-size:1.1rem;font-weight:bold;margin:20px 0;">📄 TODOS ('+total+')</button>';
        if (jugadores.size > 0) {
            h += '<h3>👤 Por Jugador</h3><div style="max-height:50vh;overflow-y:auto;">';
            jugadores.forEach(function(j) {
                let c = 0;
                snap.forEach(function(ch) { if (ch.val().asignadoA === j) c++; });
                h += '<div style="background:#f1f5f9;padding:12px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">';
                h += '<div><strong>👤 '+j+'</strong><br><span style="font-size:0.8rem;">'+c+' cart.</span></div>';
                h += '<button onclick="exportarPDFPorJugador(\''+j.replace(/'/g,"\\'")+'\')" style="background:#8b5cf6;color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;">📄 PDF</button>';
                h += '</div>';
            });
            h += '</div>';
        }
        h += '</div>';
        preview.innerHTML = h;
    });
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bingo Pro Admin');
    document.getElementById('btnGenerar').addEventListener('click', generarLote);
    document.getElementById('btnGuardar').addEventListener('click', exportarJSON);
    document.getElementById('btnAbrir').addEventListener('click', function() { document.getElementById('fileIn').click(); });
    document.getElementById('btnPDF').addEventListener('click', abrirMenuPDF);
    document.getElementById('btnLinks').addEventListener('click', verLinks);
    document.getElementById('btnJugadores').addEventListener('click', verJugadores);
    document.getElementById('btnBorrar').addEventListener('click', borrarTodo);
    document.getElementById('btnIrJuego').addEventListener('click', function() { location.href = 'ruleta.html'; });
    const ba = document.getElementById('btnAsignar');
    if (ba) ba.addEventListener('click', asignarAJugador);
    document.getElementById('fileIn').addEventListener('change', importarJSON);
    document.getElementById('buscadorCartones').addEventListener('input', function(e) { filtrarCartones(e.target.value); });
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) { if (e.key === 'Enter') generarLote(); });
    mostrarLista();
});
