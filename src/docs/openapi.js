const path = require("path");
const swaggerJSDoc = require("swagger-jsdoc");

const port = process.env.PORT || 3000;

const options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Bank API - Express",
            version: "1.0.0",
            description: "Documentación OpenAPI para la API de Express"
        },
        servers: [
            {
                url: process.env.PUBLIC_BASE_URL || `http://localhost:${port}`
            }
        ]
    },
    apis: [
        path.join(__dirname, "../../app.js"),
        path.join(__dirname, "../routes/v1/*.js")
    ]
};

const openApiSpec = swaggerJSDoc(options);

module.exports = openApiSpec;