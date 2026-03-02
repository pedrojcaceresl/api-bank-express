// seed-load-test.js
require('dotenv').config();
const prisma = require("./src/utils/prisma");

async function main() {
  console.log('🌱 Iniciando seed para Load Test...');

  const minId = 1;
  const maxId = 100;
  const saldoInicial = 1000000.0;

  console.log("📦 Asegurando tipos de cuenta...");
  await prisma.tipos_cuenta.createMany({
    data: [
      { id: 1, nombre: "Ahorro", descripcion: "Cuenta de ahorros" },
      { id: 2, nombre: "Corriente", descripcion: "Cuenta corriente" }
    ],
    skipDuplicates: true
  });

  console.log(`👤 Asegurando clientes ${minId}..${maxId}...`);
  const clientes = [];
  for (let i = minId; i <= maxId; i++) {
    clientes.push({
      id: i,
      nombre: `Cliente ${i}`,
      email: `cliente${i}@loadtest.local`,
      created_at: new Date()
    });
  }
  await prisma.clientes.createMany({ data: clientes, skipDuplicates: true });

  console.log(`🏦 Asegurando cuentas ${minId}..${maxId}...`);
  const existing = await prisma.cuentas.findMany({
    where: {
      id: {
        gte: BigInt(minId),
        lte: BigInt(maxId)
      }
    },
    select: { id: true }
  });

  const existingIds = new Set(existing.map((c) => Number(c.id)));
  const missingAccounts = [];

  for (let i = minId; i <= maxId; i++) {
    if (!existingIds.has(i)) {
      missingAccounts.push({
        id: BigInt(i),
        cliente_id: i,
        tipo_cuenta_id: (i % 2) + 1,
        numero_cuenta: `CT-${i.toString().padStart(8, "0")}`,
        saldo: saldoInicial,
        created_at: new Date()
      });
    }
  }

  if (missingAccounts.length > 0) {
    await prisma.cuentas.createMany({ data: missingAccounts, skipDuplicates: true });
  }

  const updateResult = await prisma.cuentas.updateMany({
    where: {
      id: {
        gte: BigInt(minId),
        lte: BigInt(maxId)
      }
    },
    data: { saldo: saldoInicial }
  });

  console.log(`✅ ${updateResult.count} cuentas listas con saldo.`);

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