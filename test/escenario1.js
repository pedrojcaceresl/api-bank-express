import http from "k6/http";
import { check, group, sleep } from "k6";

// =========================
// Config por ENV
// =========================
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api/v1";

// Hot accounts fijas
const HOT_IDS = [6, 7, 8, 9, 10];

// Rango de cuentas "no-hot" (asumimos IDs numéricas y existentes)
const MIN_NORMAL_ID = __ENV.MIN_NORMAL_ID ? parseInt(__ENV.MIN_NORMAL_ID, 10) : 6;
const MAX_ACCOUNT_ID = __ENV.MAX_ACCOUNT_ID ? parseInt(__ENV.MAX_ACCOUNT_ID, 10) : 100; // REDUCIDO para asegurar que existan en DB pequeña

// Qué porcentaje del tráfico pega al hotspot
const HOT_RATIO = __ENV.HOT_RATIO ? parseFloat(__ENV.HOT_RATIO) : 0.85;

// Montos (ajusta para evitar agotar saldo)
const MIN_AMOUNT = __ENV.MIN_AMOUNT ? parseFloat(__ENV.MIN_AMOUNT) : 1;
const MAX_AMOUNT = __ENV.MAX_AMOUNT ? parseFloat(__ENV.MAX_AMOUNT) : 5;

// Seed reproducible
const SEED = __ENV.SEED ? parseInt(__ENV.SEED, 10) : 12345;

// =========================
// Opciones k6 (concurrencia real)
// =========================
export const options = {
  scenarios: {
    transferencias_concurrentes: {
      executor: "ramping-arrival-rate",
      startRate: __ENV.START_RATE ? parseInt(__ENV.START_RATE, 10) : 50,
      timeUnit: "1s",
      preAllocatedVUs: __ENV.PRE_VUS ? parseInt(__ENV.PRE_VUS, 10) : 100,
      maxVUs: __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS, 10) : 1000,
      stages: [
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 200, duration: "30s" },
        { target: __ENV.TARGET_RATE ? parseInt(__ENV.TARGET_RATE, 10) : 200, duration: "1m" },
        { target: 0, duration: "15s" },
      ],
      tags: { scenario: "1_concurrency", operation: "transfer" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // Permitir hasta 5% de fallos por contención
    http_req_duration: ["p(95)<2000"],
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

function pickOne(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randAmount(rng) {
  const raw = MIN_AMOUNT + (MAX_AMOUNT - MIN_AMOUNT) * rng();
  return Math.round(raw * 100) / 100;
}

function pickPairDifferent(rng, pickFn) {
  const a = pickFn();
  let b = pickFn();
  if (b === a) b = pickFn();
  return [a, b];
}

// =========================
// Default: 1 iteración = 1 transferencia con validación ocasional
// =========================
export default function () {
  const rng = mulberry32(SEED + __VU * 100000 + __ITER);

  group("Escenario 1 - Concurrencia (transferencias simultáneas)", () => {
    
    // TIPO DE ESCENARIO:
    // 'HOT-DEST': Muchos origenes -> Pocos destinos (Contención de fila destino)
    // 'HOT-HOT': Pocos orígenes <-> Pocos destinos (Contención máxima / Deadlocks probables)
    const SCENARIO_TYPE = __ENV.SCENARIO_TYPE || 'HOT-DEST'; 

    let originId, destId;

    if (SCENARIO_TYPE === 'HOT-HOT') {
       // Hotspot puro: Todo ocurre entre las cuentas 1..5
       [originId, destId] = pickPairDifferent(rng, () => pickOne(rng, HOT_IDS));
    } else {
       // HOT-DEST (Default): Normales envían a Hot
       originId = randInt(rng, MIN_NORMAL_ID, MAX_ACCOUNT_ID);
       destId = pickOne(rng, HOT_IDS);
    }
    
    const monto = randAmount(rng);

    const res = http.post(
      `${BASE_URL}/transferencias`, // ⬅️ CAMBIO: Volver al Síncrono para comparativa real
      JSON.stringify({
        cuenta_origen_id: originId,
        cuenta_destino_id: destId,
        monto,
      }),
      jsonHeaders()
    );

    const checkRes = check(res, {
      "status esperado (2xx)": (r) => r.status === 200 || r.status === 201, // 200/201 OK = "Procesado y guardado en DB"
    });

    if (!checkRes) {
      console.error(`Fallo request. Status: ${res.status}. Body: ${res.body}`);
    }

    if (!checkRes) {
      console.error(`Fallo request. Status: ${res.status}. Body: ${res.body}`);
    }

    // Validacion de consistencia ligera (~1% de las veces)
    // Verificamos que el saldo no sea negativo en una de las cuentas involucradas
    if (rng() < 0.01) {
       const checkId = rng() < 0.5 ? originId : destId;
       const resCheck = http.get(`${BASE_URL}/cuentas/${checkId}/saldo`);
       
       if (resCheck.status === 200) {
          const body = resCheck.json();
          check(resCheck, {
             "Saldo consistente (no negativo)": () => parseFloat(body.saldo) >= 0
          });
       }
    }

    // Pequeña desincronización
    sleep(rng() * 0.15);
  });
}

