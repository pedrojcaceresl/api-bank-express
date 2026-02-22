// src/controllers/transferencias-async.controller.js
const { transferenciasQueue } = require('../utils/queue');
const STATUS = require("http-status").status;

const encolarTransferencia = async (req, res) => {
  try {
    const { cuenta_origen_id, cuenta_destino_id, monto } = req.body;
    
    // Validaciones básicas (sintaxis) antes de encolar
    if (!cuenta_origen_id || !cuenta_destino_id || !monto) {
        return res.status(STATUS.BAD_REQUEST).json({ error: "Faltan campos requeridos" });
    }

    // Agregar a la cola
    const job = await transferenciasQueue.add('transferencia', {
      cuenta_origen_id, 
      cuenta_destino_id, 
      monto
    });

    // Responder INMEDIATAMENTE "Aceptado para procesamiento"
    res.status(STATUS.ACCEPTED).json({
      message: "Transferencia en proceso",
      jobId: job.id,
      status: "queued"
    });

  } catch (error) {
    console.error("Error encolando:", error);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: "Error interno al procesar solicitud" });
  }
};

module.exports = { encolarTransferencia };