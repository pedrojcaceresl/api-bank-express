const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require('pg')


// Configuración de la conexión a la base de datos

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:mysecretpassword@127.0.0.1:5433/bank_db";

const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 20),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
    ssl: false // PgBouncer local normalmente no tiene SSL, aseguramos
})


const adapter = new PrismaPg(pool)


const prisma = new PrismaClient({
    adapter
});


module.exports = prisma;