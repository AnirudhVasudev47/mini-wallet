import { Request, Response, NextFunction } from "express";

interface ValidationRule {
  field: string;
  type: "string" | "number";
  required?: boolean;
}

/**
 * Creates a middleware that validates request body fields.
 * Returns 400 with a descriptive error message if validation fails.
 */
export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required !== false && (value === undefined || value === null || value === "")) {
        errors.push(`'${rule.field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== "") {
        if (rule.type === "string" && typeof value !== "string") {
          errors.push(`'${rule.field}' must be a string`);
        }
        if (rule.type === "number" && (typeof value !== "number" || isNaN(value))) {
          errors.push(`'${rule.field}' must be a valid number`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(", ") });
      return;
    }

    next();
  };
}
