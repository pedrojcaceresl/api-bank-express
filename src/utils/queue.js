const { Queue } = require('bullmq');
const logger = require('morgan'); // Reutilizamos morgan si queremos logs HTTP, pero para workers mejor console o winston

// Configuración de la conexión a Valkey (compatible con Redis)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379)
};

// Cola para transferencias
const transferenciasQueue = new Queue('transferencias', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Reintentar 3 veces si falla (para locks/timeouts)
    backoff: {
      type: 'exponential',
      delay: 1000, // Esperar 1s, 2s, 4s...
    },
    removeOnComplete: 100, // Mantener historial corto
    removeOnFail: 500 // Mantener historial de fallos para debug
  }
});

module.exports = {
  transferenciasQueue,
  connection
};