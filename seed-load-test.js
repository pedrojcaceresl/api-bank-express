// seed-load-test.js
require('dotenv').config();
const prisma = require("./src/utils/prisma");

async function main() {
  console.log('🌱 Iniciando seed para Load Test...');

  // Limpiar datos existentes (Opcional, comenta si prefieres mantener)
  // await prisma.transacciones.deleteMany({});
  // await prisma.transferencias.deleteMany({});
  // await prisma.cuentas.deleteMany({});
  // await prisma.clientes.deleteMany({});
  
  // Si ya tienes usuarios/cuentas, mejor solo ACTUALIZAR saldos masivamente
  // para que el test no falle por "Saldo insuficiente"
  
  const minId = 1;
  const maxId = 100; // Ajusta según tus datos reales
  
  console.log(`🔄 Reseteando saldos para cuentas de usuarios ${minId} a ${maxId}...`);

  // Opción A: Actualizar saldo de cuentas existentes
  // Le damos 1,000,000 a cada cuenta para que nunca se queden sin saldo en el test
  const updateResult = await prisma.cuentas.updateMany({
    where: {
      id: {
        gte: minId, 
        lte: maxId
      }
    },
    data: {
      saldo: 1000000.00 
    }
  });

  console.log(`✅ ${updateResult.count} cuentas actualizadas con saldo millonario.`);

  // Opción B: Si faltan cuentas, crearlas (Descomenta si necesitas)
  /*
  for (let i = 1; i <= 200; i++) {
    const exists = await prisma.cuentas.findUnique({ where: { id: i } });
    if (!exists) {
        // Crear cliente dummy si es necesario
        // ...
        // Crear cuenta
        await prisma.cuentas.create({
            data: {
                id: i,
                numero_cuenta: `CT-${i.toString().padStart(6, '0')}`,
                saldo: 1000000,
                cliente_id: 1, // Asume que cliente 1 existe
                tipo_cuenta_id: 1
            }
        });
    }
  }
  */

  console.log('🚀 Seed completado. Listo para k6.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });