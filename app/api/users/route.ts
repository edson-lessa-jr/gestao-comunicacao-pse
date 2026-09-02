import { getCloudflareContext } from "@opennextjs/cloudflare";
import { bootstrapAdminLogin, hashPassword, requireApiUser, UserRole } from "../../lib/auth";

const ROLES = new Set<UserRole>(["CONSULTA", "COMUNICADOR", "ADMIN"]);
const STATUSES = new Set(["ATIVO", "INATIVO"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_PATTERN = /^[a-z0-9._-]{3,50}$/;

function db() {
  const binding = (getCloudflareContext().env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("Banco de dados indisponível");
  return binding;
}

function normalize(row: Record<string, unknown>) {
  return { id: row.id, login: row.login, email: row.email, fullName: row.full_name, role: row.role, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by };
}

function validationError(login: string, email: string, fullName: string, role: string, status: string, password?: string, passwordRequired = false) {
  if (!LOGIN_PATTERN.test(login)) return "O login deve ter de 3 a 50 caracteres e usar apenas letras minúsculas, números, ponto, hífen ou sublinhado.";
  if (!EMAIL_PATTERN.test(email)) return "Informe um e-mail válido.";
  if (fullName.length < 3 || fullName.length > 150) return "Informe o nome completo do usuário.";
  if (!ROLES.has(role as UserRole)) return "Perfil inválido.";
  if (!STATUSES.has(status)) return "Situação inválida.";
  if ((passwordRequired || password) && (!password || password.length < 8)) return "A senha deve possuir pelo menos 8 caracteres.";
  return null;
}

export async function GET(request: Request) {
  const admin = await requireApiUser(request, ["ADMIN"]);
  if (!admin) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const result = await db().prepare("SELECT id, login, email, full_name, role, status, created_at, updated_at, created_by FROM users ORDER BY full_name COLLATE NOCASE").all<Record<string, unknown>>();
  return Response.json({ users: (result.results ?? []).map(normalize) });
}

export async function POST(request: Request) {
  const admin = await requireApiUser(request, ["ADMIN"]);
  if (!admin) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const payload = await request.json() as { login?: string; email?: string; password?: string; fullName?: string; role?: string; status?: string };
  const login = (payload.login ?? "").trim().toLowerCase();
  const email = (payload.email ?? "").trim().toLowerCase();
  const fullName = (payload.fullName ?? "").trim();
  const role = payload.role ?? "";
  const status = payload.status ?? "ATIVO";
  const error = validationError(login, email, fullName, role, status, payload.password, true);
  if (error) return Response.json({ error }, { status: 400 });
  if (login === bootstrapAdminLogin()) return Response.json({ error: "Esse login pertence ao administrador inicial." }, { status: 409 });
  try {
    const now = new Date().toISOString();
    const inserted = await db().prepare("INSERT INTO users (login, email, password_hash, full_name, role, status, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, login, email, full_name, role, status, created_at, updated_at, created_by")
      .bind(login, email, await hashPassword(payload.password!), fullName, role, status, now, now, admin.username).first<Record<string, unknown>>();
    return Response.json({ user: normalize(inserted ?? {}) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return Response.json({ error: "O login ou o e-mail já está cadastrado." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const admin = await requireApiUser(request, ["ADMIN"]);
  if (!admin) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const payload = await request.json() as { id?: number; login?: string; email?: string; password?: string; fullName?: string; role?: string; status?: string };
  if (!Number.isInteger(payload.id)) return Response.json({ error: "Usuário inválido." }, { status: 400 });
  if (admin.id === payload.id && (payload.status === "INATIVO" || payload.role !== "ADMIN")) return Response.json({ error: "O administrador não pode retirar o próprio acesso." }, { status: 409 });
  const login = (payload.login ?? "").trim().toLowerCase();
  const email = (payload.email ?? "").trim().toLowerCase();
  const fullName = (payload.fullName ?? "").trim();
  const role = payload.role ?? "";
  const status = payload.status ?? "";
  const error = validationError(login, email, fullName, role, status, payload.password);
  if (error) return Response.json({ error }, { status: 400 });
  if (login === bootstrapAdminLogin()) return Response.json({ error: "Esse login pertence ao administrador inicial." }, { status: 409 });
  try {
    const now = new Date().toISOString();
    const passwordClause = payload.password ? ", password_hash = ?" : "";
    const values: Array<string | number> = [login, email, fullName, role, status, now];
    if (payload.password) values.push(await hashPassword(payload.password));
    values.push(payload.id!);
    const updated = await db().prepare(`UPDATE users SET login = ?, email = ?, full_name = ?, role = ?, status = ?, updated_at = ?${passwordClause} WHERE id = ? RETURNING id, login, email, full_name, role, status, created_at, updated_at, created_by`)
      .bind(...values).first<Record<string, unknown>>();
    if (!updated) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    return Response.json({ user: normalize(updated) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return Response.json({ error: "O login ou o e-mail já está cadastrado." }, { status: 409 });
    throw error;
  }
}
