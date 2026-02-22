const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const INTERVAL_MS = 1000; // Capturar cada 1 segundo
const OUTPUT_FILE = path.join(__dirname, `metrics-${Date.now()}.csv`);
const CONTAINERS = ['api-bank-app', 'bank-api-db', 'bank-api-pgbouncer']; // Filtra solo lo que nos interesa

// Escribir cabecera del CSV
const header = 'Timestamp,Container,CPU%,MemUsage(MB),MemLimit(MB),Mem%\n';
fs.writeFileSync(OUTPUT_FILE, header);

console.log(`📊 Iniciando monitoreo de recursos...`);
console.log(`💾 Guardando en: ${OUTPUT_FILE}`);
console.log('Presiona Ctrl+C para detener y analizar los datos.');

function parseMem(memStr) {
    // Ejemplo: "125.5MiB / 7.656GiB"
    const parts = memStr.split(' / ');
    if (parts.length < 2) return { usage: 0, limit: 0 };
    
    return {
        usage: convertToMB(parts[0]),
        limit: convertToMB(parts[1])
    };
}

function convertToMB(str) {
    str = str.trim();
    const value = parseFloat(str);
    if (str.includes('GiB')) return value * 1024;
    if (str.includes('MiB')) return value;
    if (str.includes('KiB')) return value / 1024;
    if (str.includes('B')) return value / 1024 / 1024;
    return value;
}

function recordStats() {
    // Formato JSON para fácil parsing
    const cmd = `docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error('Error obteniendo stats:', error);
            return;
        }

        const lines = stdout.trim().split('\n');
        const timestamp = new Date().toISOString();
        let csvChunk = '';

        lines.forEach(line => {
            const [name, cpu, memUsageStr, memPerc] = line.split('|');
            
            // Filtrar solo nuestros contenedores (opcional)
            if (CONTAINERS.length > 0 && !CONTAINERS.some(c => name.includes(c))) return;

            const mem = parseMem(memUsageStr);
            const cpuVal = parseFloat(cpu.replace('%', ''));
            const memPercVal = parseFloat(memPerc.replace('%', ''));

            csvChunk += `${timestamp},${name},${cpuVal},${mem.usage.toFixed(2)},${mem.limit.toFixed(2)},${memPercVal}\n`;
        });

        if (csvChunk) {
            fs.appendFileSync(OUTPUT_FILE, csvChunk);
            process.stdout.write('.'); // Feedback visual
        }
    });
}

// Loop infinito
setInterval(recordStats, INTERVAL_MS);
