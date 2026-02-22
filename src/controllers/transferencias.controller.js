const transferenciasService = require("../services/transferencias.service");
const STATUS = require("http-status").status;
const { replaceBigInt } = require("../utils/serializeBigInt");

const crearTransferencia = async (req, res) => {
  try {
    const { cuenta_origen_id, cuenta_destino_id, monto } = req.body;
    const required = ["cuenta_origen_id", "cuenta_destino_id", "monto"];
    const missing = required.filter((k) => req.body[k] === undefined || req.body[k] === null);
    if (missing.length) return res.status(STATUS.BAD_REQUEST).json({ error: `Faltan campos: ${missing.join(", ")}` });

    const transferencia = await transferenciasService.crearTransferencia({ cuenta_origen_id, cuenta_destino_id, monto });
    res.status(201).json(replaceBigInt(transferencia));
  } catch (error) {
    console.error("Error transferencia:", error);

    // Mapeo detallado de errores para responder correctamente al cliente
    if (error.message.includes("Saldo insuficiente")) {
      return res.status(409).json({ error: "Saldo insuficiente" });
    }
    if (error.message.includes("no encontrada")) {
      return res.status(404).json({ error: error.message });
    }
    // Errores de concurrencia de Prisma/Postgres
    if (error.code === 'P2034' || error.message.includes('deadlock') || error.message.includes('serialization')) {
        return res.status(409).json({ error: "Conflicto de concurrencia, por favor reintente" }); 
    }
    if (error.message.includes('Timed out')) {
        return res.status(503).json({ error: "Servidor saturado, intente más tarde" });
    }

    res.status(500).json({ error: "Error interno" });
  }
};

const obtenerTransferenciaById = async (req, res) => {
  try {
    const { id } = req.params;
    const transferencia = await transferenciasService.obtenerTransferenciaPorId(id);
    if (!transferencia) return res.status(STATUS.NOT_FOUND).json({ error: "Transferencia no encontrada" });
    res.status(STATUS.OK).json(replaceBigInt(transferencia));
  } catch (error) {
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

module.exports = { crearTransferencia, obtenerTransferenciaById };
