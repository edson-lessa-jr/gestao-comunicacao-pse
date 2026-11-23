import {db,scope,fail} from "../../lib/teams";
import {baseTemplates,isType,tokensFor,renderTemplate} from "../../lib/messages";
export async function GET(request:Request){
  const a=await scope(request,"manage");if(a.error)return a.error;
  const type=new URL(request.url).searchParams.get("type");if(!isType(type))return fail("Tipo inválido.");
  const row=await db().prepare("SELECT body FROM team_templates WHERE team_id=? AND type=?").bind(a.team.id,type).first<{body:string}>();
  return Response.json({body:row?.body??baseTemplates[type],tokens:tokensFor(type)});
}
export async function PUT(request:Request){
  const a=await scope(request,"manage");if(a.error)return a.error;
  const {type,body}=(await request.json()??{}) as Record<string,unknown>;if(!isType(type)||typeof body!=="string")return fail("Modelo inválido.");
  try{renderTemplate(body,type,a.team,2000,{})}catch(e){return fail(e instanceof Error?e.message:"Modelo inválido.")}
  await db().prepare("INSERT INTO team_templates(team_id,type,body) VALUES(?,?,?) ON CONFLICT(team_id,type) DO UPDATE SET body=excluded.body").bind(a.team.id,type,body).run();
  return Response.json({ok:true});
}
