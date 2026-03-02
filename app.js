require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const { apiReference } = require("@scalar/express-api-reference");
const routes = require("./src/routes/v1");
const openApiSpec = require("./src/docs/openapi");
    

const app = express();
const PORT = process.env.PORT || 3000;

//app.use(morgan("dev")); // 'dev' para logs coloridos en consola
app.use(express.json());

app.get("/openapi.json", (req, res) => {
    res.json(openApiSpec);
});

app.use("/docs", apiReference({
    spec: {
        url: "/openapi.json"
    }
}));

app.use("/api/v1", routes);

/**
 * @openapi
 * /api/v1/health-check:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check de la API
 *     responses:
 *       200:
 *         description: Estado de la API
 */
app.get("/api/v1/health-check", (req, res) => {
    res.json({
        status: "Online",
        health: "ok"
})
})

/**
 * @openapi
 * /api/v1/mensaje:
 *   get:
 *     tags:
 *       - Demo
 *     summary: Endpoint de ejemplo JSON
 *     responses:
 *       200:
 *         description: Mensaje de ejemplo
 */
app.get("/api/v1/mensaje", (req, res) => {
    res.json({
        name: "Romy",
        lastName: "Cardozo"
    })
})

/**
 * @openapi
 * /api/v1/saludar:
 *   get:
 *     tags:
 *       - Demo
 *     summary: Endpoint de ejemplo texto
 *     responses:
 *       200:
 *         description: Texto simple
 */
app.get("/api/v1/saludar", (req, res) => {
    res.send("Holi");
})

app.listen(PORT, () => {
    console.log("Bank Api corriendo en el puerto:", PORT)
})