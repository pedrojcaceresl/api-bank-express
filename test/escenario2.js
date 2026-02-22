import http from "k6/http";
import { check, group, sleep } from "k6";

// =========================
// Config por ENV
// =========================
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api/v1";

// Rango de fechas para filtros
const DESDE = __ENV.DESDE || "2026-01-01";
const HASTA = __ENV.HASTA || "2026-12-31";

// Modo:
// 'PAGINADO' -> usa limit/offset
// 'FULL' -> sin paginación (estrés máximo)
const MODE = __ENV.MODE || "PAGINADO";

// Parámetros paginación
const LIMIT = __ENV.LIMIT ? parseInt(__ENV.LIMIT, 10) : 1000;
const MAX_OFFSET = __ENV.MAX_OFFSET ? parseInt(__ENV.MAX_OFFSET, 10) : 10000;

// Seed reproducible
const SEED = __ENV.SEED ? parseInt(__ENV.SEED, 10) : 54321;

// =========================
// Opciones k6 (Alta lectura concurrente)
// =========================
export const options = {
  scenarios: {
    consultas_intensivas: {
      executor: "ramping-arrival-rate",
      startRate: __ENV.START_RATE ? parseInt(__ENV.START_RATE, 10) : 50,
      timeUnit: "1s",
      preAllocatedVUs: __ENV.PRE_VUS ? parseInt(__ENV.PRE_VUS, 10) : 100,
      maxVUs: __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS, 10) : 800,
      stages: [
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 150, duration: "30s" },
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 150, duration: "1m" },
        { target: 0, duration: "15s" },
      ],
      tags: { scenario: "2_read_heavy", operation: "report" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // Lectura debería fallar menos
    http_req_duration: ["p(95)<3000"], // Reportes pueden tardar más
  },
};

// =========================
// Helpers
// =========================
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

// =========================
// Default: 1 iteración = 1 consulta pesada
// =========================
export default function () {
  const rng = mulberry32(SEED + __VU * 100000 + __ITER);

  group("Escenario 2 - Consultas intensivas (Reporte financiero)", () => {

    let url;

    if (MODE === "FULL") {
      // Sin paginación: máximo estrés
      url = `${BASE_URL}/transacciones?desde=${DESDE}&hasta=${HASTA}`;
    } else {
      // Con paginación
      const offset = randInt(rng, 0, MAX_OFFSET);
      url = `${BASE_URL}/transacciones?desde=${DESDE}&hasta=${HASTA}&limit=${LIMIT}&offset=${offset}`;
    }

    const res = http.get(url);

    const ok = check(res, {
      "status 200": (r) => r.status === 200,
      "respuesta no vacía": (r) => r.body && r.body.length > 0,
    });

    if (!ok) {
      console.error(`Error consulta. Status: ${res.status}. Body: ${res.body}`);
    }

    // Desincronización ligera
    sleep(rng() * 0.1);
  });
}