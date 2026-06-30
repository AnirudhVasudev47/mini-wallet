export const commonSchemas = {
  ErrorResponse: {
    type: "object",
    properties: {
      error: { type: "string", example: "Descriptive error message" },
    },
  },
} as const;
