import http from "k6/http";
import { check, group, sleep } from "k6";

// =========================
// Configuración ENV
// =========================
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api/v1";

// Tamaño del lote
const BATCH_SIZE = __ENV.BATCH_SIZE ? parseInt(__ENV.BATCH_SIZE, 10) : 500;

// Rango REAL de cuentas existentes
const MIN_ACCOUNT_ID = __ENV.MIN_ACCOUNT_ID ? parseInt(__ENV.MIN_ACCOUNT_ID, 10) : 4;
const MAX_ACCOUNT_ID = __ENV.MAX_ACCOUNT_ID ? parseInt(__ENV.MAX_ACCOUNT_ID, 10) : 200;

// Montos
const MIN_AMOUNT = __ENV.MIN_AMOUNT ? parseFloat(__ENV.MIN_AMOUNT) : 1;
const MAX_AMOUNT = __ENV.MAX_AMOUNT ? parseFloat(__ENV.MAX_AMOUNT) : 5;

// Tipos válidos según tu modelo
const TIPOS = ["DEBITO", "CREDITO"];

// Seed reproducible
const SEED = __ENV.SEED ? parseInt(__ENV.SEED, 10) : 2026;

// =========================
// Opciones de carga
// =========================
export const options = {
  scenarios: {
    insercion_masiva_batch: {
      executor: "ramping-arrival-rate",
      startRate: __ENV.START_RATE ? parseInt(__ENV.START_RATE, 10) : 3,
      timeUnit: "1s",
      preAllocatedVUs: __ENV.PRE_VUS ? parseInt(__ENV.PRE_VUS, 10) : 20,
      maxVUs: __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS, 10) : 200,
      stages: [
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 10, duration: "30s" },
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 10, duration: "1m" },
        { target: 0, duration: "15s" },
      ],
      tags: { scenario: "3_batch_insert", operation: "bulk_transacciones" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

// =========================
// Helpers
// =========================
function jsonHeaders() {
  return { headers: { "Content-Type": "application/json" } };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randAmount(rng) {
  const raw = MIN_AMOUNT + (MAX_AMOUNT - MIN_AMOUNT) * rng();
  return Math.round(raw * 100) / 100;
}

function buildBatch(rng) {
  const transacciones = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    transacciones.push({
      cuenta_id: randInt(rng, MIN_ACCOUNT_ID, MAX_ACCOUNT_ID),
      tipo: TIPOS[Math.floor(rng() * TIPOS.length)],
      monto: randAmount(rng),
    });
  }

  return { transacciones };
}

// =========================
// 1 iteración = 1 lote completo
// =========================
export default function () {
  const rng = mulberry32(SEED + __VU * 100000 + __ITER);

  group("Escenario 3 - Inserción masiva de transacciones", () => {

    const payload = buildBatch(rng);

    const res = http.post(
      `${BASE_URL}/transacciones/batch`,
      JSON.stringify(payload),
      jsonHeaders()
    );

    const ok = check(res, {
      "status 200/201": (r) => r.status === 200 || r.status === 201,
    });

    if (!ok) {
      console.error(`Error batch insert. Status: ${res.status}. Body: ${res.body}`);
    }

    sleep(rng() * 0.15);
  });
}