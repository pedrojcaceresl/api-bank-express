const transaccionesService = require("../services/transacciones.service");
const STATUS = require("http-status").status;
const { replaceBigInt } = require("../utils/serializeBigInt");

const listarTransacciones = async (req, res) => {
  try {
    const { desde, hasta, cuenta_id } = req.query;
    let { limit, offset } = req.query;

    const MAX_LIMIT = 1000;
    const MAX_OFFSET = 100000; // prevenir consultas con skip enormes

    limit = Number(limit || 100);
    offset = Number(offset || 0);

    if (Number.isNaN(limit) || limit <= 0) limit = 100;
    if (Number.isNaN(offset) || offset < 0) offset = 0;

    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT; // cap para evitar cargas excesivas
    }

    if (offset > MAX_OFFSET) {
      return res.status(STATUS.BAD_REQUEST).json({ error: `Offset demasiado grande. Máximo permitido ${MAX_OFFSET}` });
    }

    const transacciones = await transaccionesService.obtenerTransacciones({ desde, hasta, cuenta_id, limit, offset });
    res.status(STATUS.OK).json(replaceBigInt(transacciones));
  } catch (error) {
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const obtenerTransaccionesPorCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const transacciones = await transaccionesService.obtenerTransaccionesPorCuenta(id, { limit, offset });
    res.status(STATUS.OK).json(replaceBigInt(transacciones));
  } catch (error) {
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const batchInsertTransacciones = async (req, res) => {
  try {
    const { transacciones } = req.body;
    if (!Array.isArray(transacciones)) return res.status(STATUS.BAD_REQUEST).json({ error: "El campo 'transacciones' debe ser un array" });
    const result = await transaccionesService.crearBatchTransacciones(transacciones);
    res.status(STATUS.CREATED).json(result);
  } catch (error) {
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

module.exports = { listarTransacciones, obtenerTransaccionesPorCuenta, batchInsertTransacciones };
