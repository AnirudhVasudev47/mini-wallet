import swaggerJsdoc from "swagger-jsdoc";
import { authSchemas, accountSchemas, transferSchemas, commonSchemas } from "./schemas/index.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Mini Wallet API",
      version: "1.0.0",
      description:
        "A ledger-based digital wallet API with double-entry bookkeeping, " +
        "JWT authentication, and idempotent transfers.",
      contact: {
        name: "Anirudh Vasudev",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token obtained from /auth/login",
        },
      },
      schemas: {
        ...authSchemas,
        ...accountSchemas,
        ...transferSchemas,
        ...commonSchemas,
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
