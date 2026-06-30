export const authSchemas = {
  RegisterRequest: {
    type: "object",
    required: ["email", "password", "user_id", "name"],
    properties: {
      email: { type: "string", format: "email", example: "alice@example.com" },
      password: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "SecureP@ss1",
        description:
          "Must contain uppercase, lowercase, number, and special character",
      },
      user_id: {
        type: "string",
        pattern: "^[a-zA-Z0-9_-]+$",
        minLength: 2,
        example: "alice_01",
        description: "Unique slug — letters, numbers, hyphens, underscores only",
      },
      name: { type: "string", minLength: 2, example: "Alice Johnson" },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "alice@example.com" },
      password: { type: "string", format: "password", example: "SecureP@ss1" },
    },
  },
  AuthResponse: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "JWT token valid for 7 days",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      user: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          user_id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
  UserInfo: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      user_id: { type: "string" },
      name: { type: "string" },
    },
  },
} as const;
