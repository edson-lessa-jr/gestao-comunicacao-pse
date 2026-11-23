"use client";
import {useCallback,useEffect,useState,type FormEvent,type ReactNode} from "react";
import type {Team,LocalRole} from "../lib/teams";
import {TYPES,TYPE_FIELDS} from "../lib/forms";
import type {CommunicationType} from "../lib/messages";

const roles:Record<LocalRole,string>={CONSULTA:"Consulta",COMUNICADOR:"Comunicador",ADMIN_TIME:"Administrador de time"};
async function api(path:string,method="GET",payload?:unknown){
  const response=await fetch(path,{method,cache:"no-store",headers:payload?{"Content-Type":"application/json"}:undefined,body:payload?JSON.stringify(payload):undefined});
  const data=await response.json() as {error?:string;teams:Team[];team:Team;members:Member[];body:string;tokens:string[]};
  if(!response.ok)throw Error(data.error||"Não foi possível concluir.");
  return data;
}
const errorText=(e:unknown)=>e instanceof Error?e.message:"Não foi possível conectar.";

export function TeamPicker({isGeneral,logout,children}:{isGeneral:boolean;logout:()=>void;children:(team:Team,chooser:ReactNode,refresh:()=>void)=>ReactNode}){
  const [teams,setTeams]=useState<Team[]|null>(null),[id,select]=useState(0),[error,setError]=useState(""),[adding,add]=useState(false),[busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{try{const {teams:list}=await api("/api/teams") as {teams:Team[]};setTeams(list);select(previous=>list.some(t=>t.id===previous)?previous:list.length===1?list[0].id:0);setError("")}catch(e){setTeams([]);setError(errorText(e))}},[]);
  useEffect(()=>{let live=true;api("/api/teams").then(({teams:list}:{teams:Team[]})=>{if(live){setTeams(list);if(list.length===1)select(list[0].id)}}).catch(e=>{if(live){setTeams([]);setError(errorText(e))}});return()=>{live=false}},[]);
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);setBusy(true);try{const {team}=await api("/api/teams","POST",Object.fromEntries(f));await refresh();select(team.id);add(false)}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  const team=teams?.find(t=>t.id===id);
  const chooser=<section className="team-picker"><label>Time ativo<select value={team?.id??""} onChange={e=>select(Number(e.target.value))}><option disabled value="">Selecione um time</option>{teams?.map(t=><option key={t.id} value={t.id}>{t.acronym} — {t.name}</option>)}</select></label>
    {isGeneral&&<button className="secondary" onClick={()=>{add(!adding);setError("")}}>{adding?"Cancelar":"Criar time"}</button>}
    {adding&&<form onSubmit={create}><label>Nome completo<input name="name" required maxLength={150}/></label><label>Sigla<input name="acronym" required maxLength={24}/></label><button className="primary" disabled={busy}>Salvar time</button></form>}
    {error&&<p role="alert">{error}</p>}</section>;
  if(team)return children(team,chooser,refresh);
  return <main className="search-panel"><h1>Gestão de Comunicados</h1><p>{!teams?"Carregando times…":teams.length?"Escolha o time em que deseja trabalhar.":"Sua conta não possui um time disponível."}</p>{chooser}<button className="secondary" onClick={logout}>Sair</button></main>;
}
function Roles({value,onChange}:{value:LocalRole;onChange:(r:LocalRole)=>void}){return <select aria-label="Perfil no time" value={value} onChange={e=>onChange(e.target.value as LocalRole)}>{Object.entries(roles).map(([r,label])=><option key={r} value={r}>{label}</option>)}</select>}
type Member={id:number;login:string;role:LocalRole;fullName:string;email:string;status:string};
function MemberRow({member,change}:{member:Member;change:(m:Member,role:LocalRole,remove?:boolean)=>Promise<void>}){
  const [role,setRole]=useState(member.role);
  return <tr><td><strong>{member.fullName}</strong><small>{member.login} · {member.email}</small></td><td>{member.status}</td><td><Roles value={role} onChange={setRole}/></td><td><button className="table-action" disabled={member.role===role} onClick={()=>change(member,role)}>Salvar perfil</button><button className="table-action" onClick={()=>{if(confirm("Retirar "+member.fullName+" apenas deste time?"))void change(member,role,true)}}>Retirar</button></td></tr>;
}
function Members({team,refresh}:{team:Team;refresh:()=>void}){
  const path="/api/members?team="+team.id;
  const [members,setMembers]=useState<Member[]>([]),[link,setLink]=useState(false),[role,setRole]=useState<LocalRole>("CONSULTA"),[msg,status]=useState(""),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{const data=await api(path);setMembers(data.members)},[path]);
  useEffect(()=>{let live=true;api(path).then(data=>{if(live)setMembers(data.members)}).catch(e=>{if(live)status(errorText(e))});return()=>{live=false}},[path]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;setBusy(true);try{await api(path,"POST",{...Object.fromEntries(new FormData(form)),role,action:link?"link":"create"});form.reset();setRole("CONSULTA");await reload();status("Integrante adicionado.")}catch(e){status(errorText(e))}finally{setBusy(false)}}
  async function change(m:Member,newRole:LocalRole,remove=false){try{await api(path,remove?"DELETE":"PATCH",{id:m.id,role:newRole});refresh();await reload();status(remove?"Integrante retirado.":"Perfil atualizado.")}catch(e){status(errorText(e))}}
  return <section className="users-layout"><form className="user-form-panel" onSubmit={submit}><h2>Adicionar integrante · {team.acronym}</h2><label>Conta<select value={link?"link":"create"} onChange={e=>setLink(e.target.value==="link")}><option value="create">Criar novo usuário</option><option value="link">Vincular usuário já cadastrado</option></select></label><div className="fields-grid">
    <label>Login<input name="login" required autoComplete="off"/></label><label>Perfil no time<Roles value={role} onChange={setRole}/></label>
    {!link&&<><label>Nome completo<input name="fullName" required minLength={3}/></label><label>E-mail<input type="email" name="email" required/></label><label>Senha<input type="password" name="password" minLength={8} required autoComplete="new-password"/></label><label>Situação<select name="status"><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select></label></>}
    </div><div className="form-actions"><button className="primary" disabled={busy}>{link?"Vincular ao time":"Criar e vincular"}</button></div></form>
    <section className="users-list-panel"><h2>Integrantes do time</h2><p>Administradores gerais têm acesso automático a todos os times.</p><p role="status">{msg}</p><div className="users-table-wrap"><table className="users-table"><thead><tr><th>Usuário</th><th>Situação da conta</th><th>Perfil no time</th><th>Ações</th></tr></thead><tbody>{members.map(m=><MemberRow key={m.id+":"+m.role} member={m} change={change}/>)}</tbody></table></div></section></section>;
}
function TemplateEditor({team,type}:{team:Team;type:CommunicationType}){
  const path="/api/templates?team="+team.id+"&type="+type;
  const [body,setBody]=useState<string|null>(null),[tokens,setTokens]=useState<string[]>([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;api(path).then(data=>{if(live){setBody(data.body);setTokens(data.tokens)}}).catch(e=>{if(live)setMsg(errorText(e))});return()=>{live=false}},[path]);
  async function save(){setBusy(true);try{await api(path,"PUT",{type,body});setMsg("Modelo salvo para "+team.acronym+". Comunicados publicados não foram alterados.")}catch(e){setMsg(errorText(e))}finally{setBusy(false)}}
  return <><p>Edite o texto e mova os marcadores. O formulário não muda. Mantenha {"{{numero}}"} na primeira linha.</p><details><summary>Campos e instruções do modelo</summary><p>{"{{time}}"}: nome completo · {"{{sigla}}"}: sigla. Blocos {"{{#campo}}…{{/campo}}"} aparecem quando o campo está preenchido. O bloco “secoes” separa os itens com uma linha em branco.</p><ul>{TYPE_FIELDS[type].map(f=><li key={f.key}>{f.label.replace("PSE",()=>team.acronym)}: <code>{"{{"+f.key+"}}"}</code></li>)}</ul><p>Todos os marcadores disponíveis:</p><p>{tokens.map(t=>"{{"+t+"}}").join(" · ")}</p></details><label>Texto do modelo<textarea className="message-editor" value={body??""} disabled={body===null} onChange={e=>setBody(e.target.value)}/></label><div className="form-actions"><button className="primary" onClick={save} disabled={body===null||busy}>Salvar modelo do time</button></div><p role="status">{msg}</p></>;
}
export function TeamAdministration({team,templates,onMembershipChange}:{team:Team;templates:boolean;onMembershipChange:()=>void}){
  const [type,select]=useState<CommunicationType>("EXTRAORDINARIA");
  if(!templates)return <Members team={team} refresh={onMembershipChange}/>;
  return <section className="search-panel"><label>Modelo<select value={type} onChange={e=>select(e.target.value as CommunicationType)}>{Object.entries(TYPES).map(([key,t])=><option key={key} value={key}>{t.label}</option>)}</select></label><TemplateEditor key={type} team={team} type={type}/></section>;
}
