import {baseTemplates} from "../../lib/messages";
import {authenticatedUser} from "../../lib/auth";
import {teamsOf, db, fail} from "../../lib/teams";
export async function GET(request:Request){
  const user=await authenticatedUser(request);
  return user?Response.json({teams:await teamsOf(user)}):fail("Sessão expirada.",401);
}
export async function POST(request:Request){
  const user=await authenticatedUser(request);
  if(user?.role!=="ADMIN")return fail("Somente o administrador geral pode criar times.",403);
  const data=(await request.json()??{}) as Record<string,unknown>;
  const name=typeof data.name==="string"?data.name.trim():"",acronym=typeof data.acronym==="string"?data.acronym.trim().toUpperCase():"";
  if(!name || name.length>150 || !/^[\p{L}\d][\p{L}\d._-]{0,23}$/u.test(acronym))return fail("Informe nome e sigla (até 24 caracteres, sem espaços).");
  const d=db();
  try{
    const batch=await d.batch([
      d.prepare("INSERT INTO teams(name,acronym) VALUES(?,?) RETURNING id,name,acronym").bind(name,acronym),
      ...Object.entries(baseTemplates).map(([type,body])=>d.prepare("INSERT INTO team_templates(team_id,type,body) SELECT id,?,? FROM teams WHERE acronym=?").bind(type,body,acronym))
    ]);
    return Response.json({team:batch[0].results[0]},{status:201});
  }catch(e){if(String(e).includes("UNIQUE"))return fail("Sigla já utilizada.",409);throw e;}
}
