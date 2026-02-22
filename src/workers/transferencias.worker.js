const { Worker } = require('bullmq');
const { connection } = require('../utils/queue');
const transferenciasService = require('../services/transferencias.service');
const { Prisma } = require('@prisma/client');
const { replaceBigInt } = require('../utils/serializeBigInt');

console.log('🚀 Iniciando Worker de Transferencias...');

const worker = new Worker('transferencias', async (job) => {
  const { cuenta_origen_id, cuenta_destino_id, monto } = job.data;
  
  // logger simulado
  // console.log(`[Job ${job.id}] Procesando transferencia de ${cuenta_origen_id} a ${cuenta_destino_id} por $${monto}`);

  try {
    // Llamamos al servicio original que YA TIENE la lógica de locks y validaciones
    const transferencia = await transferenciasService.crearTransferencia({
      cuenta_origen_id,
      cuenta_destino_id,
      monto
    });
    
    return replaceBigInt(transferencia);
  } catch (error) {
    // Si es error de saldo o cuenta no encontrada, no tiene sentido reintentar (marcar como fallido definitivo)
    // BullMQ lo reintentará si lanzamos error, así que solo lanzamos si es error transitorio
    if (error.code === 'SALDO_INSUFICIENTE' || error.message.includes('no encontrada')) {
        // Unrecoverable error: throw specialized error to stop retries? 
        // BullMQ doesn't have "UnrecoverableError" built-in easily in worker function logic usually without custom handling, 
        // but let's just throw and let it fail. attempts exhausted.
        console.error(`[Job ${job.id}] Error de negocio: ${error.message}`);
        throw error; 
    }
    
    console.error(`[Job ${job.id}] Error transitorio (BD/Lock): ${error.message}`);
    throw error; // Lanza para que BullMQ reintente con backoff
  }
}, {
  connection,
  concurrency: 50, // ¡MAGIA! Procesar 50 transferencias en PARALELO. Ajustar según CPU/DB.
  limiter: {
    max: 1000, 
    duration: 1000 // Rate limit (opcional): máx 1000 jobs por segundo para no matar la DB
  }
});

worker.on('completed', job => {
  // console.log(`[Job ${job.id}] Completado ✔️`);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job.id}] Falló definitivamente ❌: ${err.message}`);
});

module.exports = worker;