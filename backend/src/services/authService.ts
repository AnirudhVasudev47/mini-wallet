import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getPrisma } from "../database.js";
import { AppError, JWTPayload, AuthResponse } from "../types.js";

const SALT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

// ── Password Validation ───────────────────────────────────────

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
}

// ── Email Validation ──────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Register ──────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  userId: string,
  name: string,
): Promise<AuthResponse> {
  const prisma = getPrisma();

  // Validate email format
  if (!validateEmail(email)) {
    throw new AppError(400, "Invalid email format");
  }

  // Validate password
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) {
    throw new AppError(400, passwordResult.errors.join(". "));
  }

  // Validate user_id
  if (!userId || userId.trim().length < 2) {
    throw new AppError(400, "User ID must be at least 2 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new AppError(400, "User ID can only contain letters, numbers, hyphens, and underscores");
  }

  // Validate name
  if (!name || name.trim().length < 2) {
    throw new AppError(400, "Name must be at least 2 characters");
  }

  // Check for existing email
  const existingEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingEmail) {
    throw new AppError(409, "Email is already registered");
  }

  // Check for existing user_id
  const existingUserId = await prisma.account.findUnique({
    where: { userId },
  });
  if (existingUserId) {
    throw new AppError(409, `User ID '${userId}' is already taken`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create account + user in a transaction
  const [, user] = await prisma.$transaction([
    prisma.account.create({
      data: { userId, name: name.trim() },
    }),
    prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        userId,
      },
    }),
  ]);

  const token = generateToken({
    userId: user.id,
    userIdSlug: user.userId,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      user_id: user.userId,
      name: name.trim(),
    },
  };
}

// ── Login ─────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const prisma = getPrisma();

  if (!email || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { account: true },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = generateToken({
    userId: user.id,
    userIdSlug: user.userId,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      user_id: user.userId,
      name: user.account.name,
    },
  };
}

// ── Get Current User ──────────────────────────────────────────

export async function getCurrentUser(
  payload: JWTPayload,
): Promise<AuthResponse["user"]> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { account: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    user_id: user.userId,
    name: user.account.name,
  };
}

// ── JWT Helpers ───────────────────────────────────────────────

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
