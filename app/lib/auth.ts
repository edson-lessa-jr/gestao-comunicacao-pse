import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE_NAME = "pse_session";
const MAX_AGE = 60 * 60 * 8;
const PASSWORD_ITERATIONS = 100_000;

export type UserRole = "CONSULTA" | "COMUNICADOR" | "ADMIN";
export type AuthUser = {
  id: number | null;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: "ATIVO";
  source: "bootstrap" | "database";
};

type SessionPayload = { username: string; userId: number | null; source: AuthUser["source"]; expiresAt: number };

function runtimeEnv() {
  return getCloudflareContext().env as unknown as Record<string, string | D1Database | undefined>;
}

function database() {
  const binding = runtimeEnv().DB;
  if (!binding || typeof binding === "string") throw new Error("Banco de dados indisponível");
  return binding;
}

function base64url(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToBase64url(value: Uint8Array) {
  return base64url(String.fromCharCode(...value));
}

function fromBase64url(value: string) {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmac(value: string) {
  const secret = runtimeEnv().PSE_SESSION_SECRET;
  if (!secret || typeof secret !== "string") throw new Error("PSE_SESSION_SECRET não configurado");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = new Uint8Array(salt).buffer;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations }, material, 256));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64url(salt)}$${bytesToBase64url(hash)}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsText, saltText, expected] = stored.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || !saltText || !expected) return false;
  const salt = Uint8Array.from(fromBase64url(saltText), character => character.charCodeAt(0));
  return safeEqual(bytesToBase64url(await derivePassword(password, salt, iterations)), expected);
}

function normalizeUser(row: Record<string, unknown>): AuthUser {
  return { id: Number(row.id), username: String(row.login), email: String(row.email), fullName: String(row.full_name), role: row.role as UserRole, status: "ATIVO", source: "database" };
}

export function bootstrapAdminLogin() {
  const login = runtimeEnv().PSE_ADMIN_USER;
  return typeof login === "string" ? login.trim().toLowerCase() : "";
}

export async function verifyCredentials(username: string, password: string): Promise<AuthUser | null> {
  const login = username.trim().toLowerCase();
  const expectedUser = runtimeEnv().PSE_ADMIN_USER;
  const expectedPassword = runtimeEnv().PSE_ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword || typeof expectedUser !== "string" || typeof expectedPassword !== "string") throw new Error("Credenciais administrativas não configuradas");
  if (safeEqual(login, expectedUser.trim().toLowerCase()) && safeEqual(password, expectedPassword)) {
    return { id: null, username: expectedUser, email: "", fullName: "Administrador", role: "ADMIN", status: "ATIVO", source: "bootstrap" };
  }
  const row = await database().prepare("SELECT * FROM users WHERE login = ? AND status = 'ATIVO' LIMIT 1").bind(login).first<Record<string, unknown>>();
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) return null;
  return normalizeUser(row);
}

export async function createSessionCookie(user: AuthUser) {
  const payload = base64url(JSON.stringify({ username: user.username, userId: user.id, source: user.source, expiresAt: Date.now() + MAX_AGE * 1000 } satisfies SessionPayload));
  return `${COOKIE_NAME}=${payload}.${await hmac(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

async function sessionPayload(request: Request): Promise<SessionPayload | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(await hmac(payload), signature)) return null;
  try {
    const data = JSON.parse(fromBase64url(payload)) as SessionPayload;
    return data.expiresAt > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export async function authenticatedUser(request: Request): Promise<AuthUser | null> {
  const session = await sessionPayload(request);
  if (!session) return null;
  if (session.source === "bootstrap") {
    const expectedUser = runtimeEnv().PSE_ADMIN_USER;
    if (typeof expectedUser !== "string" || !safeEqual(session.username.trim().toLowerCase(), expectedUser.trim().toLowerCase())) return null;
    return { id: null, username: expectedUser, email: "", fullName: "Administrador", role: "ADMIN", status: "ATIVO", source: "bootstrap" };
  }
  if (!session.userId) return null;
  const row = await database().prepare("SELECT * FROM users WHERE id = ? AND status = 'ATIVO' LIMIT 1").bind(session.userId).first<Record<string, unknown>>();
  return row ? normalizeUser(row) : null;
}

export async function requireApiUser(request: Request, roles?: UserRole[]) {
  const user = await authenticatedUser(request);
  if (!user || (roles && !roles.includes(user.role))) return null;
  return user;
}
