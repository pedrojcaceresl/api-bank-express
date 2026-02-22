// src/utils/retryTransaction.js
const { Prisma } = require('@prisma/client');

/**
 * Reintenta una operación si falla por errores de concurrencia o conexión transitoria.
 * Útil para Deadlocks o Timeouts bajo alta carga.
 */
async function withRetry(operation, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      const isDeadlock = error.code === 'P2034' || // Prisma transaction fail
                         (error.message && error.message.includes('deadlock detected')) ||
                         (error.code === '40P01'); // Postgres deadlock code

      const isConnectionIssue = error.message && error.message.includes('connection');

      // Solo reintentar si es deadlock o error de conexión, y si queda intentos
      if ((isDeadlock || isConnectionIssue) && attempt < maxRetries) {
        const delay = Math.random() * 200 * attempt; // Backoff exponencial con jitter
        console.warn(`Reintentando operación por error transitorio (Intento ${attempt}/${maxRetries}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Si no es error reintentable o se acabaron los intentos, lanzar
      throw error;
    }
  }
}

module.exports = { withRetry };