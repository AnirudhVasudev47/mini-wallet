export const transferSchemas = {
  TransferRequest: {
    type: "object",
    required: ["transaction_id", "to_user", "amount"],
    properties: {
      transaction_id: {
        type: "string",
        format: "uuid",
        description: "Client-generated UUID for idempotency",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      to_user: {
        type: "string",
        example: "bob_42",
        description: "Recipient user_id slug",
      },
      amount: {
        type: "number",
        format: "double",
        minimum: 0.01,
        example: 100.0,
      },
      notes: {
        type: "string",
        nullable: true,
        example: "Lunch money",
        description: "Optional transfer note",
      },
    },
  },
  TransferResponse: {
    type: "object",
    properties: {
      transaction_id: { type: "string", format: "uuid" },
      from_user: { type: "string", example: "alice_01" },
      to_user: { type: "string", example: "bob_42" },
      amount: { type: "number", format: "double", example: 100.0 },
      timestamp: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["completed", "duplicate"] },
    },
  },
} as const;
