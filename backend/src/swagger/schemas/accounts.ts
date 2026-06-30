export const accountSchemas = {
  AccountWithBalance: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      user_id: { type: "string", example: "alice_01" },
      name: { type: "string", example: "Alice Johnson" },
      created_at: { type: "string", format: "date-time" },
      balance: { type: "number", format: "double", example: 1250.0 },
    },
  },
  BalanceResponse: {
    type: "object",
    properties: {
      user_id: { type: "string", example: "alice_01" },
      balance: { type: "number", format: "double", example: 1250.0 },
    },
  },
  DepositRequest: {
    type: "object",
    required: ["amount"],
    properties: {
      amount: {
        type: "number",
        format: "double",
        minimum: 0.01,
        example: 500.0,
        description: "Amount to deposit (must be positive)",
      },
    },
  },
  DepositResponse: {
    type: "object",
    properties: {
      transaction_id: { type: "string", format: "uuid" },
      amount: { type: "number", format: "double", example: 500.0 },
      balance: { type: "number", format: "double", example: 1750.0 },
    },
  },
  TransactionView: {
    type: "object",
    properties: {
      transaction_id: { type: "string", format: "uuid" },
      type: { type: "string", enum: ["credit", "debit"] },
      amount: { type: "number", format: "double", example: 100.0 },
      counterparty_id: { type: "string", example: "bob_42" },
      description: { type: "string", nullable: true, example: "Transfer from bob_42" },
      notes: { type: "string", nullable: true, example: "Lunch money" },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;
