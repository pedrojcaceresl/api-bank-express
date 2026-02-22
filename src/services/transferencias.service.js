const prisma = require("../utils/prisma");
const { Prisma } = require("@prisma/client");

const crearTransferencia = async ({ cuenta_origen_id, cuenta_destino_id, monto }) => {
  if (!cuenta_origen_id || !cuenta_destino_id || monto === undefined || monto === null) {
    throw new Error("Faltan datos requeridos para realizar la transferencia");
  }

  const origenId = BigInt(cuenta_origen_id);
  const destinoId = BigInt(cuenta_destino_id);
  const montoDec = new Prisma.Decimal(String(monto));

  return await prisma.$transaction(async (tx) => {
    // OPTIMIZACIÓN: Usar raw SQL para locking explícito (SELECT FOR UPDATE)
    // Esto evita condiciones de carrera "Lost Update" en alta concurrencia
    
    // ORDEN DETERMINISTA DE LOCKS: Siempre bloquear primero el ID menor
    // Esto previene Deadlocks cuando dos transacciones intentan bloquear (A, B) y (B, A) al mismo tiempo
    const firstLockId = origenId < destinoId ? origenId : destinoId;
    const secondLockId = origenId < destinoId ? destinoId : origenId;

    const cuenta1 = await tx.$queryRaw`SELECT id, saldo FROM cuentas WHERE id = ${firstLockId} FOR UPDATE`;
    const cuenta2 = await tx.$queryRaw`SELECT id, saldo FROM cuentas WHERE id = ${secondLockId} FOR UPDATE`;

    const cuentaOrigen = origenId === firstLockId ? cuenta1[0] : cuenta2[0];
    const cuentaDestino = destinoId === firstLockId ? cuenta1[0] : cuenta2[0];

    if (!cuentaOrigen) throw new Error("Cuenta origen no encontrada");
    if (!cuentaDestino) throw new Error("Cuenta destino no encontrada");

    const saldoOrigen = new Prisma.Decimal(String(cuentaOrigen.saldo));
    if (saldoOrigen.lt(montoDec)) {
        // Optimización: Lanzar error específico para que la API responda 400/409 y no 500
        const error = new Error("Saldo insuficiente");
        error.code = "SALDO_INSUFICIENTE";
        throw error;
    }

    const nuevoSaldoOrigen = saldoOrigen.minus(montoDec);
    const saldoDestino = new Prisma.Decimal(String(cuentaDestino.saldo));
    const nuevoSaldoDestino = saldoDestino.plus(montoDec);

    // Actualizaciones en memoria (UPDATE rápido)
    await tx.cuentas.update({
      where: { id: origenId },
      data: { saldo: nuevoSaldoOrigen }
    });

    await tx.cuentas.update({
      where: { id: destinoId },
      data: { saldo: nuevoSaldoDestino }
    });

    const transferencia = await tx.transferencias.create({
      data: {
        cuenta_origen_id: origenId,
        cuenta_destino_id: destinoId,
        monto: montoDec
      }
    });

    // Opcional: insertar transacciones débito/credito de forma asíncrona o batch si fuera posible
    // Aquí seguimos dentro de la TX para consistencia fuerte
    await tx.transacciones.create({
      data: {
        cuenta_id: origenId,
        tipo: "debito",
        monto: montoDec
      }
    });

    await tx.transacciones.create({
      data: {
        cuenta_id: destinoId,
        tipo: "credito",
        monto: montoDec
      }
    });

    return transferencia;
  }, {
    // Configuración avanzada de transacción para evitar timeouts prematuros
    maxWait: 5000, // Tiempo máximo esperando adquirir una conexión del pool
    timeout: 10000 // Tiempo máximo que la transacción puede durar antes de abortar
  });
};

const obtenerTransferenciaPorId = async (id) => {
  const transferencia = await prisma.transferencias.findUnique({ where: { id: BigInt(id) } });
  return transferencia;
};

module.exports = {
  crearTransferencia,
  obtenerTransferenciaPorId
};
