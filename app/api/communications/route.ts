import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireApiUser } from "../../lib/auth";
import { CommunicationType, Fields, recordTitle, renderMessage } from "../../lib/messages";

const TYPES = new Set(["EXTRAORDINARIA", "ATUALIZACAO_VERSAO", "BOLETIM_PERIODICO", "INFORMATIVA_OPERACIONAL"]);

function db() {
  const binding = (getCloudflareContext().env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("Banco de dados indisponível");
  return binding;
}

function currentYear() {
  return Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));
}

function normalize(row: Record<string, unknown>) {
  return { id: row.id, type: row.type, year: row.year, number: row.number, status: row.status, title: row.title, fieldsJson: row.fields_json, renderedMessage: row.rendered_message, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, cancelledAt: row.cancelled_at };
}

export async function GET(request: Request) {
  if (!(await requireApiUser(request))) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const url = new URL(request.url);
  const clauses: string[] = [];
  const values: Array<string | number> = [];
  const type = url.searchParams.get("type");
  const number = url.searchParams.get("number");
  const year = url.searchParams.get("year");
  if (type && TYPES.has(type)) { clauses.push("type = ?"); values.push(type); }
  if (number && /^\d+$/.test(number)) { clauses.push("number = ?"); values.push(Number(number)); }
  if (year && /^\d{4}$/.test(year)) { clauses.push("year = ?"); values.push(Number(year)); }
  const sql = `SELECT * FROM communications ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY year DESC, number DESC LIMIT 200`;
  const result = await db().prepare(sql).bind(...values).all<Record<string, unknown>>();
  return Response.json({ communications: (result.results ?? []).map(normalize) });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, ["COMUNICADOR", "ADMIN"]);
  if (!user) return Response.json({ error: "Seu perfil permite somente consultar comunicados." }, { status: 403 });
  const payload = await request.json() as { type?: CommunicationType; fields?: Fields; action?: "preview" | "publish"; renderedMessage?: string };
  if (!payload.type || !TYPES.has(payload.type) || !payload.fields) return Response.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
  const year = currentYear();
  if (payload.action === "preview") {
    return Response.json({ preview: { type: payload.type, year, title: recordTitle(payload.type, payload.fields), renderedMessage: renderMessage(payload.type, null, year, payload.fields) } });
  }
  const editedMessage = payload.renderedMessage;
  if (!editedMessage?.trim()) return Response.json({ error: "Gere e revise a pré-visualização antes de publicar." }, { status: 400 });
  if (!editedMessage.includes("[NN]")) return Response.json({ error: "Mantenha o marcador [NN] no cabeçalho para receber a numeração definitiva." }, { status: 400 });
  const now = new Date().toISOString();
  const result = await db().prepare("INSERT INTO communications (type, year, number, status, title, fields_json, rendered_message, created_by, created_at, updated_at) VALUES (?, ?, 0, 'ATIVO', ?, ?, ?, ?, ?, ?)")
    .bind(payload.type, year, recordTitle(payload.type, payload.fields), JSON.stringify(payload.fields), editedMessage, user.username, now, now).run();
  const id = Number(result.meta.last_row_id);
  const inserted = await db().prepare("SELECT * FROM communications WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!inserted || Number(inserted.number) === 0) throw new Error("Não foi possível atribuir a numeração do comunicado");
  return Response.json({ communication: normalize(inserted) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireApiUser(request))) return Response.json({ error: "Não autenticado" }, { status: 401 });
  return Response.json({ error: "Comunicados publicados são definitivos e não podem ser alterados ou cancelados." }, { status: 409 });
}
