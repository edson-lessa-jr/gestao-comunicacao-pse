import {db,scope,fail} from "../../lib/teams";
import {bootstrapAdminLogin,hashPassword} from "../../lib/auth";

type MemberInput={login:string;role:string;id:number;email:string;password:string;fullName:string;status:string;action:string};
const roles=new Set(["CONSULTA","COMUNICADOR","ADMIN_TIME"]);
export async function GET(request:Request){
  const access=await scope(request,"manage"); if(access.error)return access.error;
  const result=await db().prepare("SELECT u.id,u.login,u.full_name AS fullName,u.email,u.status,m.role FROM team_members m JOIN users u ON u.id=m.user_id WHERE m.team_id=? AND u.role<>'ADMIN' ORDER BY u.full_name").bind(access.team.id).all();
  return Response.json({members:result.results});
}
export async function POST(request:Request){
  const access=await scope(request,"manage"); if(access.error)return access.error;
  const p=(await request.json()??{}) as MemberInput,id=access.team.id;
  const login=typeof p.login==="string"?p.login.trim().toLowerCase():"";
  if(!roles.has(p.role)||!login||login===bootstrapAdminLogin())return fail("Login ou perfil inválido.");
  try{
    if(p.action==="link"){
      const res=await db().prepare("INSERT INTO team_members(team_id,user_id,role) SELECT ?,id,? FROM users WHERE login=? AND role<>'ADMIN' ON CONFLICT DO NOTHING").bind(id,p.role,login).run();
      if(!res.meta.changes)return fail("Não foi possível vincular esse login. Confira se a conta existe e se já possui acesso.",409);
    }else if(p.action==="create"){
      const email=typeof p.email==="string"?p.email.trim().toLowerCase():"", name=typeof p.fullName==="string"?p.fullName.trim():"";
      if(!/^[a-z0-9._-]{3,50}$/.test(login)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<3||name.length>150||typeof p.password!=="string"||p.password.length<8||p.password.length>256||!["ATIVO","INATIVO"].includes(p.status))return fail("Confira login, e-mail, nome, situação e senha (8 a 256 caracteres).");
      const now=new Date().toISOString(),d=db();
      await d.batch([
        d.prepare("INSERT INTO users(login,email,password_hash,full_name,role,status,created_at,updated_at,created_by) VALUES(?,?,?,?,'CONSULTA',?,?,?,?)").bind(login,email,await hashPassword(p.password),name,p.status,now,now,access.user.username),
        d.prepare("INSERT INTO team_members(team_id,user_id,role) SELECT ?,id,? FROM users WHERE login=?").bind(id,p.role,login)
      ]);
    }else return fail("Ação inválida.");
  }catch(e){if(String(e).includes("UNIQUE"))return fail("Login ou e-mail já cadastrado. Para uma conta existente, use Vincular.",409);throw e;}
  return Response.json({ok:true},{status:201});
}
async function change(request:Request,remove:boolean){
  const access=await scope(request,"manage");if(access.error)return access.error;
  const p=(await request.json()??{}) as MemberInput;
  if(!Number.isSafeInteger(p.id)||(!remove&&!roles.has(p.role)))return fail("Integrante ou perfil inválido.");
  const predicate=" WHERE team_id=? AND user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=team_members.user_id AND role<>'ADMIN')";
  const result=remove
    ? await db().prepare("DELETE FROM team_members"+predicate).bind(access.team.id,p.id).run()
    : await db().prepare("UPDATE team_members SET role=?"+predicate).bind(p.role,access.team.id,p.id).run();
  return result.meta.changes?Response.json({ok:true}):fail("Vínculo não encontrado.",404);
}
export const PATCH=(request:Request)=>change(request,false);
export const DELETE=(request:Request)=>change(request,true);
