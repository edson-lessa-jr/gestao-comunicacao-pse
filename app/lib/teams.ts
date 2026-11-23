import {getCloudflareContext} from "@opennextjs/cloudflare";
import {authenticatedUser, type AuthUser} from "./auth";

export type LocalRole = "CONSULTA"|"COMUNICADOR"|"ADMIN_TIME";
export type Team = {id:number;name:string;acronym:string;role:LocalRole|"ADMIN"};
export const db = () => (getCloudflareContext().env as unknown as {DB:D1Database}).DB;
export const fail = (error:string,status=400) => Response.json({error},{status});
export const manages = (role:Team["role"]) => role==="ADMIN" || role==="ADMIN_TIME";
export async function teamsOf(user:AuthUser) {
  const stmt=user.role==="ADMIN"
    ? db().prepare("SELECT id,name,acronym,'ADMIN' AS role FROM teams ORDER BY name")
    : db().prepare("SELECT t.id,t.name,t.acronym,m.role FROM teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=? ORDER BY t.name").bind(user.id);
  return (await stmt.all<Team>()).results;
}
export async function scope(request:Request, permission:"read"|"publish"|"manage"="read") {
  const user=await authenticatedUser(request);
  if(!user) return {error:fail("Sessão expirada.",401)} as const;
  const id=Number(new URL(request.url).searchParams.get("team"));
  if(!Number.isSafeInteger(id)||id<=0) return {error:fail("Selecione um time.")} as const;
  const team=user.role==="ADMIN"
    ? await db().prepare("SELECT id,name,acronym,'ADMIN' AS role FROM teams WHERE id=?").bind(id).first<Team>()
    : await db().prepare("SELECT t.id,t.name,t.acronym,m.role FROM teams t JOIN team_members m ON m.team_id=t.id WHERE t.id=? AND m.user_id=?").bind(id,user.id).first<Team>();
  if(!team || (permission==="publish" && team.role==="CONSULTA") || (permission==="manage" && !manages(team.role))) return {error:fail("Sem permissão neste time.",403)} as const;
  return {user,team} as const;
}
