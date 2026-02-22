require('dotenv').config();
// Cargar worker
require('./src/workers/transferencias.worker');

// Mantener proceso vivo
console.log('👷 Worker Service corriendo. Presiona Ctrl+C para salir.');

// Manejo de señales para graceful shutdown
process.on('SIGTERM', async () => {
    // Cerrar conexiones si fuera necesario
    process.exit(0);
});