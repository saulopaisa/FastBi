// generar-movil.js - Funciones móviles y atajos

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎫 Generador listo - Sala:', SALA_ID);
    
    // Cargar cartones al iniciar
    importarDesdeFirebase();
    
    // Enter en nombre asigna
    document.getElementById('nombreJugador').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') asignarCartones();
    });
    
    // Enter en cantidad genera
    document.getElementById('cantidadGenerar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') generarCartones();
    });
});

// Cerrar modal al hacer clic fuera
document.getElementById('modalLink').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal('modalLink');
});
