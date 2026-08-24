"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type CommunicationType = "EXTRAORDINARIA" | "ATUALIZACAO_VERSAO" | "BOLETIM_PERIODICO" | "INFORMATIVA_OPERACIONAL";
type Communication = { id:number; type:CommunicationType; year:number; number:number; status:"ATIVO"|"CANCELADO"; title:string; fieldsJson:string; renderedMessage:string; createdAt:string; updatedAt:string; cancelledAt:string|null };
type CommunicationPreview = { type:CommunicationType; year:number; title:string; renderedMessage:string };
type ApiResponse = { communications?:Communication[]; preview?:CommunicationPreview; communication?:Communication; error?:string };
type FieldDefinition = { key:string; label:string; type?:"text"|"date"|"datetime-local"|"textarea"|"select"|"multiselect"; options?:string[]; placeholder?:string; required?:boolean; wide?:boolean; hint?:string };

const TRIBUNALS=[
  "TJRN — Tribunal de Justiça do Estado do Rio Grande do Norte",
  "TJPE — Tribunal de Justiça do Estado de Pernambuco",
  "TJPB — Tribunal de Justiça do Estado da Paraíba",
  "TJMA — Tribunal de Justiça do Estado do Maranhão",
  "TJRO — Tribunal de Justiça do Estado de Rondônia",
  "TJCE — Tribunal de Justiça do Estado do Ceará",
  "TJDFT — Tribunal de Justiça do Distrito Federal e dos Territórios",
  "TJMT — Tribunal de Justiça do Estado de Mato Grosso",
  "TJES — Tribunal de Justiça do Estado do Espírito Santo",
  "TJPI — Tribunal de Justiça do Estado do Piauí",
  "TJPA — Tribunal de Justiça do Estado do Pará",
];

const TYPES: Record<CommunicationType,{label:string;short:string;description:string;tone:string}> = {
  EXTRAORDINARIA:{label:"Comunicação extraordinária",short:"Extraordinária",description:"Instabilidade, indisponibilidade ou incidente urgente",tone:"#b42318"},
  ATUALIZACAO_VERSAO:{label:"Atualização de versão",short:"Atualização",description:"Funcionalidades, melhorias e correções disponibilizadas",tone:"#075985"},
  BOLETIM_PERIODICO:{label:"Boletim periódico",short:"Boletim",description:"Evolução da PSE, entregas recentes e roadmap",tone:"#5b21b6"},
  INFORMATIVA_OPERACIONAL:{label:"Informativa / operacional",short:"Informativa",description:"Orientações, procedimentos, prazos e capacitação",tone:"#166534"},
};

const TYPE_FIELDS: Record<CommunicationType,FieldDefinition[]> = {
  EXTRAORDINARIA:[
    {key:"occurrenceType",label:"Tipo de ocorrência",type:"select",options:["INSTABILIDADE","INDISPONIBILIDADE","MANUTENÇÃO EMERGENCIAL"],required:true},
    {key:"eventDateTime",label:"Data e hora do comunicado",type:"datetime-local",required:true},
    {key:"occurrenceDescription",label:"Descrição objetiva da ocorrência",type:"textarea",placeholder:"Ex.: instabilidade momentânea que pode impactar determinadas funcionalidades.",required:true,wide:true},
    {key:"affectedItems",label:"Funcionalidades, operações ou integrações afetadas",type:"textarea",placeholder:"Informe um item por linha.",required:true,wide:true},
    {key:"impactedAudience",label:"Tribunais, unidades ou perfis atingidos",type:"multiselect",options:TRIBUNALS,required:true,wide:true},
    {key:"userGuidance",label:"Orientação aos usuários",type:"textarea",placeholder:"Aguardar, evitar repetir uma operação, suspender um procedimento ou adotar contingência.",required:true,wide:true},
    {key:"dataParagraph",label:"Parágrafo sobre integridade dos dados",type:"select",options:["Incluir — confirmação técnica recebida","Omitir — ainda não confirmado"],required:true,wide:true},
    {key:"occurrenceRestriction",label:"A ocorrência está restrita a",placeholder:"Ex.: acesso e exibição de informações",wide:true},
    {key:"nextUpdate",label:"Próxima atualização",placeholder:"Ex.: às 16h30 ou assim que houver alteração relevante",required:true,wide:true},
  ],
  ATUALIZACAO_VERSAO:[
    {key:"version",label:"Versão PSE",placeholder:"Ex.: 2.8.0",required:true},
    {key:"releaseDateTime",label:"Data e hora da disponibilização",type:"datetime-local",required:true},
    {key:"newFeatures",label:"Novas funcionalidades",type:"textarea",placeholder:"Uma entrega por linha: Título — descrição, público e benefício. Se não houver, deixe em branco.",wide:true},
    {key:"improvements",label:"Melhorias",type:"textarea",placeholder:"Uma melhoria por linha: Título — fluxo aprimorado e resultado esperado.",wide:true},
    {key:"fixes",label:"Correções",type:"textarea",placeholder:"Uma correção por linha: Título — comportamento corrigido e resultado esperado.",wide:true},
    {key:"impactedProfiles",label:"Perfis ou unidades impactados",required:true,wide:true},
    {key:"businessProcesses",label:"Processos de negócio impactados",required:true,wide:true},
    {key:"integrations",label:"Integrações impactadas",placeholder:"PJe, PDPJ-Br, outra ou sem impacto",required:true,wide:true},
    {key:"expectedAction",label:"Ação esperada do tribunal",type:"textarea",placeholder:"Nenhuma ação, orientar usuários, validar funcionalidade, atualizar componente ou configurar.",required:true,wide:true},
    {key:"integrationUpdate",label:"Há atualização de integração?",type:"select",options:["Não","Sim"],required:true},
    {key:"integratedComponent",label:"Componente integrado",placeholder:"Ex.: PJe"},
    {key:"minimumVersion",label:"Versão mínima do componente",placeholder:"Preencha quando houver atualização"},
    {key:"deploymentStart",label:"Início da janela de implantação",type:"datetime-local",required:true},
    {key:"deploymentEnd",label:"Fim da janela de implantação",type:"datetime-local",required:true},
    {key:"availabilityImpact",label:"Comportamento durante a janela",type:"select",options:["não haverá indisponibilidade","a PSE ficará indisponível","determinadas operações poderão apresentar intermitência"],required:true,wide:true},
  ],
  BOLETIM_PERIODICO:[
    {key:"referencePeriod",label:"Período de referência",placeholder:"Ex.: agosto/2026 ou 01/08/2026 a 31/08/2026",required:true,wide:true},
    {key:"delivered",label:"Entregas disponibilizadas",type:"textarea",placeholder:"Uma entrega por linha: Título — descrição objetiva.",required:true,wide:true},
    {key:"inDevelopment",label:"Em desenvolvimento",type:"textarea",placeholder:"Um item por linha: Título — objetivo e benefício esperado.",wide:true},
    {key:"inAnalysis",label:"Em análise",type:"textarea",placeholder:"Um item por linha: Título — problema ou necessidade avaliada.",wide:true},
    {key:"priorities",label:"Próximas prioridades",type:"textarea",placeholder:"Um tema, funcionalidade ou processo por linha.",wide:true},
    {key:"deployments",label:"Implantações e integrações",type:"textarea",placeholder:"Uma por linha: Tribunal ou integração — situação e próximo passo.",wide:true},
    {key:"attentionActions",label:"Ações ou pontos de atenção",type:"textarea",placeholder:"Uma ação, validação ou informação por linha.",wide:true},
    {key:"responsible",label:"Responsável",placeholder:"Tribunal, unidade ou equipe"},
    {key:"deadline",label:"Prazo",type:"date"},
  ],
  INFORMATIVA_OPERACIONAL:[
    {key:"subject",label:"Título do assunto",placeholder:"Título objetivo para o comunicado",required:true,wide:true},
    {key:"publicationDate",label:"Data do comunicado",type:"date",required:true},
    {key:"information",label:"Informação, orientação ou mudança",type:"textarea",placeholder:"Apresente objetivamente a informação ou providência necessária.",required:true,wide:true},
    {key:"targetAudience",label:"Público-alvo",type:"textarea",placeholder:"Tribunais, unidades, magistrados, servidores, administradores ou equipes técnicas.",required:true,wide:true},
    {key:"guidance",label:"Orientação",type:"textarea",placeholder:"Descreva o procedimento que deverá ser adotado.",required:true,wide:true},
    {key:"steps",label:"Passos",type:"textarea",placeholder:"Um passo por linha. Opcional.",wide:true},
    {key:"deadlineMode",label:"Regra de prazo",type:"select",options:["A providência deverá ser realizada até","A orientação passa a valer a partir de","Não há prazo aplicável"],required:true},
    {key:"deadline",label:"Data do prazo ou vigência",type:"date"},
    {key:"attentionPoints",label:"Pontos de atenção",type:"textarea",placeholder:"Uma restrição, requisito, consequência ou dependência por linha.",wide:true},
    {key:"documentationLink",label:"Link específico da documentação",placeholder:"https://...",wide:true},
  ],
};

function brazilDateInput(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date())}
function initialFields(type:CommunicationType):Record<string,string>{const date=brazilDateInput();const now=new Date();const offset=now.getTimezoneOffset()*60000;const local=new Date(now.getTime()-offset).toISOString().slice(0,16);return type==="INFORMATIVA_OPERACIONAL"?{publicationDate:date}:{eventDateTime:local,releaseDateTime:local,deploymentStart:local}}
function formatNumber(item:Pick<Communication,"number"|"year">){return `Nº ${String(item.number).padStart(2,"0")}/${String(item.year).slice(-2)}`}
function formatDate(value:string){if(!value)return"—";return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(value.includes("T")?value:`${value}T12:00:00-03:00`))}
function selectedOptions(value:string|undefined){return(value??"").split("; ").filter(Boolean)}

export default function Home(){
  const [session,setSession]=useState<"loading"|"anonymous"|"authenticated">("loading");
  const [username,setUsername]=useState("");const[password,setPassword]=useState("");const[loginError,setLoginError]=useState("");
  const[view,setView]=useState<"new"|"search">("new");const[selectedType,setSelectedType]=useState<CommunicationType>("EXTRAORDINARIA");
  const[fields,setFields]=useState<Record<string,string>>(()=>initialFields("EXTRAORDINARIA"));const[records,setRecords]=useState<Communication[]>([]);
  const[current,setCurrent]=useState<Communication|null>(null);const[preview,setPreview]=useState<CommunicationPreview|null>(null);const[busy,setBusy]=useState(false);const[notice,setNotice]=useState("");
  const[filterType,setFilterType]=useState<CommunicationType|"">("");const[filterNumber,setFilterNumber]=useState("");const[filterYear,setFilterYear]=useState(String(new Date().getFullYear()));
  useEffect(()=>{fetch("/api/auth/session",{cache:"no-store"}).then(r=>setSession(r.ok?"authenticated":"anonymous")).catch(()=>setSession("anonymous"))},[]);
  // A carga inicial deve ocorrer apenas quando a sessão muda para autenticada.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(session==="authenticated")loadRecords({year:String(new Date().getFullYear())})},[session]);
  const selectedFields=useMemo(()=>TYPE_FIELDS[selectedType],[selectedType]);

  async function login(event:FormEvent){event.preventDefault();setBusy(true);setLoginError("");try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});const data=await response.json() as{error?:string};if(!response.ok){setLoginError(response.status===401?"Usuário ou senha inválidos.":data.error??"Não foi possível autenticar.");return}setPassword("");setSession("authenticated")}catch{setLoginError("Não foi possível conectar ao sistema. Tente novamente.")}finally{setBusy(false)}}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});setSession("anonymous");setRecords([]);setCurrent(null)}
  async function loadRecords(custom?:{type?:string;number?:string;year?:string}){const query=new URLSearchParams();const values=custom??{type:filterType,number:filterNumber,year:filterYear};if(values.type)query.set("type",values.type);if(values.number)query.set("number",values.number.replace(/\D/g,""));if(values.year)query.set("year",values.year);const response=await fetch(`/api/communications?${query}`,{cache:"no-store"});if(response.status===401){setSession("anonymous");return}const data=await response.json() as ApiResponse;setRecords(data.communications??[])}
  async function previewCommunication(event:FormEvent){event.preventDefault();if(selectedType==="EXTRAORDINARIA"&&!fields.impactedAudience){setNotice("Selecione ao menos um tribunal atingido.");return}setBusy(true);setNotice("");const response=await fetch("/api/communications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:selectedType,fields,action:"preview"})});const data=await response.json() as ApiResponse;setBusy(false);if(!response.ok||!data.preview){setNotice(data.error??"Não foi possível gerar a pré-visualização.");return}setPreview(data.preview);setCurrent(null);setNotice("Pré-visualização gerada. Nenhum número foi reservado.")}
  async function publishCommunication(){if(!preview)return;if(!window.confirm("Publicar este comunicado? Um número será atribuído e, depois disso, ele não poderá ser alterado nem cancelado."))return;setBusy(true);setNotice("");const response=await fetch("/api/communications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:selectedType,fields,action:"publish"})});const data=await response.json() as ApiResponse;setBusy(false);if(!response.ok||!data.communication){setNotice(data.error??"Não foi possível publicar o comunicado.");return}setPreview(null);setCurrent(data.communication);setNotice(`Comunicado ${formatNumber(data.communication)} publicado. O registro agora é definitivo.`);await loadRecords({year:String(data.communication.year)})}
  function startNew(type:CommunicationType=selectedType){setSelectedType(type);setFields(initialFields(type));setCurrent(null);setPreview(null);setNotice("");setView("new")}
  function selectType(type:CommunicationType){setSelectedType(type);setFields(initialFields(type));setCurrent(null);setPreview(null)}
  function updateField(key:string,value:string){setFields(previous=>({...previous,[key]:value}));setPreview(null);setCurrent(null)}
  async function copyMessage(message:string){await navigator.clipboard.writeText(message);setNotice("Mensagem copiada para a área de transferência.")}

  if(session==="loading")return <main className="center-screen"><div className="spinner" aria-label="Carregando"/></main>;
  if(session==="anonymous")return <main className="login-shell"><section className="login-brand"><div className="brand-mark"><img src="/pse-logo.png" alt="Logomarca da Plataforma Socioeducativa" width="72" height="75" fetchPriority="high"/></div><p className="eyebrow">Plataforma Socioeducativa</p><h1>Comunicados claros, numerados e prontos para divulgar.</h1><p>Crie, revise e consulte comunicações oficiais da PSE em um único lugar.</p></section><form className="login-card" onSubmit={login}><div><p className="eyebrow">Acesso restrito</p><h2>Entrar no sistema</h2><p className="muted">Use suas credenciais de administração.</p></div><label>Usuário<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{loginError&&<p className="error" role="alert">{loginError}</p>}<button className="primary" disabled={busy}>{busy?"Entrando...":"Entrar"}</button></form></main>;

  return <main className="app-shell">
    <aside className="sidebar"><div className="sidebar-brand"><span className="sidebar-logo"><img src="/pse-logo.png" alt="Logomarca PSE" width="33" height="34"/></span><div><strong>Comunicados</strong><small>Gestão institucional</small></div></div><nav aria-label="Navegação principal"><button className={view==="new"?"active":""} onClick={()=>startNew()}><span>＋</span>Novo comunicado</button><button className={view==="search"?"active":""} onClick={()=>{setView("search");loadRecords()}}><span>⌕</span>Consultar</button></nav><div className="sidebar-foot"><p>Sessão administrativa</p><button onClick={logout}>Sair</button></div></aside>
    <section className="workspace"><header className="topbar"><div><p className="eyebrow">Plataforma Socioeducativa</p><h1>{view==="new"?"Novo comunicado":"Consultar comunicados"}</h1></div><div className="year-chip">Ano corrente <strong>{new Date().getFullYear()}</strong></div></header>
      {notice&&<div className="notice" role="status"><span>✓</span>{notice}<button onClick={()=>setNotice("")} aria-label="Fechar aviso">×</button></div>}
      {view==="new"?<div className="content-grid"><section className="form-panel">
        <div className="type-section"><div className="section-heading"><div><span className="step">1</span><h2>Escolha a finalidade</h2></div><p>Cada tipo possui numeração anual independente.</p></div><div className="type-grid">{(Object.keys(TYPES) as CommunicationType[]).map(type=><button key={type} type="button" className={`type-card ${selectedType===type?"selected":""}`} onClick={()=>selectType(type)} style={{"--tone":TYPES[type].tone} as React.CSSProperties}><span className="type-dot"/><strong>{TYPES[type].short}</strong><small>{TYPES[type].description}</small><span className="radio"/></button>)}</div></div>
        <form onSubmit={previewCommunication}><div className="section-heading"><div><span className="step">2</span><h2>Informações do comunicado</h2></div><p>Campos definidos conforme o modelo de {TYPES[selectedType].short.toLowerCase()}.</p></div><div className="fields-grid">{selectedFields.map(field=><label key={field.key} className={field.wide?"wide":""}>{field.label}{field.required&&<em>*</em>}{field.type==="textarea"?<textarea rows={4} value={fields[field.key]??""} onChange={e=>updateField(field.key,e.target.value)} placeholder={field.placeholder} required={field.required}/>:field.type==="select"?<select value={fields[field.key]??""} onChange={e=>updateField(field.key,e.target.value)} required={field.required}><option value="">Selecione</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:field.type==="multiselect"?<div className="multi-select" role="group" aria-label={field.label}><div className="multi-toolbar"><span>{selectedOptions(fields[field.key]).length} de {field.options?.length} selecionados</span><div><button type="button" onClick={()=>updateField(field.key,(field.options??[]).join("; "))}>Selecionar todos</button><button type="button" onClick={()=>updateField(field.key,"")}>Limpar</button></div></div><div className="multi-options">{field.options?.map(option=>{const selected=selectedOptions(fields[field.key]).includes(option);return <label className="check-option" key={option}><input type="checkbox" checked={selected} onChange={()=>{const values=selectedOptions(fields[field.key]);const next=selected?values.filter(value=>value!==option):[...values,option];updateField(field.key,next.join("; "))}}/><span><strong>{option.split(" — ")[0]}</strong>{option.split(" — ")[1]}</span></label>})}</div></div>:<input type={field.type??"text"} value={fields[field.key]??""} onChange={e=>updateField(field.key,e.target.value)} placeholder={field.placeholder} required={field.required}/>}</label>)}</div><div className="form-actions"><button type="button" className="secondary" onClick={()=>startNew(selectedType)}>Limpar</button><button className="primary" disabled={busy}>{busy?"Gerando prévia...":"Pré-visualizar"}</button></div></form>
      </section><aside className="preview-panel"><div className="preview-header"><div><p className="eyebrow">{current?"Mensagem publicada":"Pré-visualização"}</p><h2>{current?`${TYPES[current.type].short} ${formatNumber(current)}`:preview?`${TYPES[preview.type].short} — sem número`:"Prévia do comunicado"}</h2></div>{current&&<span className="status ativo">PUBLICADO</span>}{preview&&<span className="status rascunho">NÃO PUBLICADO</span>}</div>{current?<pre>{current.renderedMessage}</pre>:preview?<pre>{preview.renderedMessage}</pre>:<div className="empty-preview"><span>▤</span><strong>A mensagem aparecerá aqui</strong><p>Preencha o formulário e clique em Pré-visualizar. A numeração só será atribuída ao publicar.</p></div>}{(current||preview)&&<div className="preview-actions">{current&&<button className="primary" onClick={()=>copyMessage(current.renderedMessage)}>Copiar mensagem</button>}{preview&&<><button className="primary" onClick={publishCommunication} disabled={busy}>{busy?"Publicando...":"Publicar comunicado"}</button><button className="secondary" onClick={()=>copyMessage(preview.renderedMessage)}>Copiar prévia</button></>}</div>}</aside></div>
      :<section className="search-panel"><div className="search-filters"><label>Tipo<select value={filterType} onChange={e=>setFilterType(e.target.value as CommunicationType|"")}><option value="">Todos os tipos</option>{(Object.keys(TYPES) as CommunicationType[]).map(type=><option key={type} value={type}>{TYPES[type].short}</option>)}</select></label><label>Número<input inputMode="numeric" value={filterNumber} onChange={e=>setFilterNumber(e.target.value)} placeholder="Ex.: 16"/></label><label>Ano<input inputMode="numeric" value={filterYear} onChange={e=>setFilterYear(e.target.value)} placeholder="2026"/></label><button className="primary" onClick={()=>loadRecords()}>Pesquisar</button></div><div className="results-head"><div><h2>Comunicados publicados</h2><p>{records.length} resultado(s) encontrado(s)</p></div><button className="secondary" onClick={()=>{setFilterType("");setFilterNumber("");setFilterYear("");loadRecords({})}}>Limpar filtros</button></div><div className="records">{records.length===0?<div className="empty-list">Nenhum comunicado encontrado com os filtros informados.</div>:records.map(item=><article className="record" key={item.id}><div className="record-icon" style={{background:TYPES[item.type].tone}}>{TYPES[item.type].short.slice(0,1)}</div><div className="record-main"><div className="record-title"><strong>{TYPES[item.type].short} {formatNumber(item)}</strong><span className={`status ${item.status.toLowerCase()}`}>{item.status==="ATIVO"?"PUBLICADO":"CANCELADO"}</span></div><h3>{item.title}</h3><p>Publicado em {formatDate(item.createdAt)} · Ano {item.year}</p></div><div className="record-actions"><button onClick={()=>setCurrent(item)}>Visualizar</button><button onClick={()=>copyMessage(item.renderedMessage)}>Copiar</button></div></article>)}</div>{current&&<div className="dialog-backdrop" onClick={()=>setCurrent(null)}><div className="message-dialog" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="preview-header"><div><p className="eyebrow">Mensagem publicada</p><h2>{TYPES[current.type].short} {formatNumber(current)}</h2></div><button className="close" onClick={()=>setCurrent(null)}>×</button></div><pre>{current.renderedMessage}</pre><div className="preview-actions"><button className="primary" onClick={()=>copyMessage(current.renderedMessage)}>Copiar mensagem</button><button className="secondary" onClick={()=>setCurrent(null)}>Fechar</button></div></div></div>}</section>}
    </section>
  </main>;
}
