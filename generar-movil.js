// generar-movil.js - Inicialización

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎫 Generador listo - Sala:', SALA_ID);
    
    // Cargar cartones desde Firebase
    cargarDesdeSupabase();
    
    // Enter en cantidad genera
    var cantidadInput = document.getElementById('cantidadGenerar');
    if (cantidadInput) {
        cantidadInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') generarCartones();
        });
    }
    
    // Enter en nombre asigna seleccionados
    var nombreAsignar = document.getElementById('nombreAsignarSeleccionados');
    if (nombreAsignar) {
        nombreAsignar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') asignarSeleccionados();
        });
    }
    
    // Enter en nombre jugador link
    var nombreLink = document.getElementById('nombreJugadorLink');
    if (nombreLink) {
        nombreLink.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') generarLinkJugador();
        });
    }
});
