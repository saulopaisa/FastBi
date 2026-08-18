// generar-movil.js - Inicialización

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎫 Generador listo - Sala:', SALA_ID);
    
    // Cargar cartones desde Supabase
    cargarDesdeSupabase();
    
    // Enter en cantidad genera cartones
    var cantidadInput = document.getElementById('cantidadGenerar');
    if (cantidadInput) {
        cantidadInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generarCartones();
            }
        });
    }
    
    // Enter en nombre asigna seleccionados
    var nombreAsignar = document.getElementById('nombreAsignarSeleccionados');
    if (nombreAsignar) {
        nombreAsignar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                asignarSeleccionados();
            }
        });
    }
    
    // Enter en buscador de jugadores
    var buscarJugadorInput = document.getElementById('buscarJugador');
    if (buscarJugadorInput) {
        buscarJugadorInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarJugadores();
            }
        });
    }
});
