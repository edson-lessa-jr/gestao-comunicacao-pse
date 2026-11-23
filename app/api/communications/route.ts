import {db,scope,fail} from "../../lib/teams";
import {TYPE_FIELDS} from "../../lib/forms";
import {isType,baseTemplates,renderTemplate,recordTitle,type CommunicationType,type Fields} from "../../lib/messages";
function currentYear() {
  return Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));
}

function normalize(row: Record<string, unknown>) {
  return { id: row.id, type: row.type, year: row.year, number: row.number, status: row.status, title: row.title, fieldsJson: row.fields_json, renderedMessage: row.rendered_message, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, cancelledAt: row.cancelled_at };
}

export async function GET(request: Request) {
  const a=await scope(request);if(a.error)return a.error;
  const url = new URL(request.url);
  const clauses: string[] = ["team_id=?"];
  const values: Array<string | number> = [a.team.id];
  const type = url.searchParams.get("type");
  const number = url.searchParams.get("number");
  const year = url.searchParams.get("year");
  if (type && isType(type)) { clauses.push("type = ?"); values.push(type); }
  if (number && /^\d+$/.test(number)) { clauses.push("number = ?"); values.push(Number(number)); }
  if (year && /^\d{4}$/.test(year)) { clauses.push("year = ?"); values.push(Number(year)); }
  const sql = `SELECT * FROM communications ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY year DESC, number DESC LIMIT 200`;
  const result = await db().prepare(sql).bind(...values).all<Record<string, unknown>>();
  return Response.json({ communications: (result.results ?? []).map(normalize) });
}

export async function POST(request: Request) {
  const a=await scope(request,"publish");if(a.error)return a.error;
  const {user,team}=a;
  const payload=await request.json() as {type:CommunicationType;fields:Fields;action:string;renderedMessage?:string};
  const {type,fields}=payload;
  if(!isType(type)||!fields||typeof fields!=="object"||Array.isArray(fields)||Object.values(fields).some(v=>typeof v!=="string")||TYPE_FIELDS[type].some(f=>f.required&&!fields[f.key]?.trim()))return fail("Preencha os campos obrigatórios.");
  const year=currentYear();
  if(payload.action==="preview"){
    const custom=await db().prepare("SELECT body FROM team_templates WHERE team_id=? AND type=?").bind(team.id,type).first<{body:string}>();
    try{return Response.json({preview:{type,year,title:recordTitle(type,fields,team),renderedMessage:renderTemplate(custom?.body??baseTemplates[type],type,team,year,fields)}})}
    catch{return fail("Confira as datas e o modelo do time.")}
  }
  if(payload.action!=="publish")return fail("Ação inválida.");
  const editedMessage=payload.renderedMessage;
  if(typeof editedMessage!=="string" || editedMessage.split("[NN]").length!==2 || !editedMessage.split("\n")[0].includes("[NN]/"+String(year).slice(-2)))return fail("Gere a prévia e preserve a numeração do ano atual no cabeçalho.");
  const now = new Date().toISOString();
  const result = await db().prepare("INSERT INTO communications (team_id, type, year, number, status, title, fields_json, rendered_message, created_by, created_at, updated_at) VALUES (?, ?, ?, 0, 'ATIVO', ?, ?, ?, ?, ?, ?)")
    .bind(team.id, payload.type, year, recordTitle(type,fields,team), JSON.stringify(payload.fields), editedMessage, user.username, now, now).run();
  const id = Number(result.meta.last_row_id);
  const inserted = await db().prepare("SELECT * FROM communications WHERE id = ? AND team_id = ?").bind(id,team.id).first<Record<string, unknown>>();
  if (!inserted || Number(inserted.number) === 0) throw new Error("Não foi possível atribuir a numeração do comunicado");
  return Response.json({ communication: normalize(inserted) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const a=await scope(request);if(a.error)return a.error;
  return Response.json({ error: "Comunicados publicados são definitivos e não podem ser alterados ou cancelados." }, { status: 409 });
}
