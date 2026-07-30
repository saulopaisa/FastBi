// generar-movil.js - Funciones móviles y atajos

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎫 Generador listo - Sala:', SALA_ID);
    
    // Cargar cartones al iniciar
    if (typeof importarDesdeFirebase === 'function') {
        importarDesdeFirebase();
    }
    
    // Enter en nombre asigna cartones
    var nombreInput = document.getElementById('nombreJugador');
    if (nombreInput) {
        nombreInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') asignarCartones();
        });
    }
    
    // Enter en cantidad genera cartones
    var cantidadInput = document.getElementById('cantidadGenerar');
    if (cantidadInput) {
        cantidadInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') generarCartones();
        });
    }
    
    // Cerrar modal al hacer clic fuera
    var modalLink = document.getElementById('modalLink');
    if (modalLink) {
        modalLink.addEventListener('click', function(e) {
            if (e.target === this) cerrarModal('modalLink');
        });
    }
    
    // Escape cierra modales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal('modalLink');
        }
    });
});
