const { crearTransferencia, obtenerTransferenciaById } = require("../../controllers/transferencias.controller");
const { encolarTransferencia } = require("../../controllers/transferencias-async.controller");
const express = require("express");
const router = express.Router();

router.post("/", crearTransferencia);
router.post("/async", encolarTransferencia); // 🔥 Nueva ruta para probar colas
router.get("/:id", obtenerTransferenciaById);

module.exports = router;
