import templates from "./base-templates.json";
import {TYPE_FIELDS} from "./forms";
export type CommunicationType="EXTRAORDINARIA"|"ATUALIZACAO_VERSAO"|"BOLETIM_PERIODICO"|"INFORMATIVA_OPERACIONAL";
export type Fields=Record<string,string>;
function asBrazilInstant(value:string){return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)?`${value}:00-03:00`:value)}
function dateTime(value?:string){if(!value)return"data e horário a definir";const formatted=new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Sao_Paulo"}).format(asBrazilInstant(value));const[day,time]=formatted.split(", ");return `${day}, às ${time.replace(":","h")}`}
function dateOnly(value?:string){if(!value)return"data a definir";return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(`${value}T12:00:00-03:00`))}
function timeOnly(value?:string){if(!value)return"horário a definir";return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Sao_Paulo"}).format(asBrazilInstant(value)).replace(":","h")}
function bullets(value?:string){return(value??"").split("\n").map(line=>line.trim()).filter(Boolean).map(line=>`▫ ${line.replace(/^[-•▫]\s*/,"")};`).join("\n")}
function steps(value?:string){return(value??"").split("\n").map(line=>line.trim()).filter(Boolean).map((line,index)=>`${index+1}. ${line.replace(/^\d+[.)]\s*/,"")}${/[.;]$/.test(line)?"":";"}`).join("\n")}

export const baseTemplates=templates;
export const isType=(key:unknown):key is CommunicationType => typeof key==="string" && Object.hasOwn(templates,key);
type Identity={name:string;acronym:string};
export function recordTitle(type:CommunicationType,fields:Fields,team:Identity){if(type==="EXTRAORDINARIA")return (fields.occurrenceType||"Ocorrência")+" — "+team.acronym;if(type==="ATUALIZACAO_VERSAO")return "Versão "+(fields.version||"não informada");if(type==="BOLETIM_PERIODICO")return "Boletim "+(fields.referencePeriod||"periódico");return fields.subject||"Comunicado informativo"}

function values(type:CommunicationType,team:Identity,year:number,f:Fields) {
  const map:Fields=Object.create(null);
  Object.assign(map,{time:team.name,sigla:team.acronym,timeMaiusculo:team.name.toUpperCase(),numero:"[NN]/"+String(year).slice(-2)});
  for(const field of TYPE_FIELDS[type]){
    const k=field.key, v=f[k]||"";
    map[k]=v;
    if(field.type==="datetime-local"){map[k+"DataHora"]=dateTime(v);map[k+"Hora"]=timeOnly(v);}
    if(field.type==="date")map[k+"Data"]=dateOnly(v);
    if(field.type==="textarea")map[k+"Lista"]=bullets(v);
  }
  if(type==="EXTRAORDINARIA")Object.assign(map,{incluirIntegridade:f.dataParagraph?.startsWith("Incluir")?"1":"",restricao:f.occurrenceRestriction||"acesso, processamento, integração ou exibição de informações"});
  if(type==="ATUALIZACAO_VERSAO")Object.assign(map,{atualizarIntegracao:f.integrationUpdate==="Sim"?"1":"",componente:f.integratedComponent||"componente integrado",versaoMinima:f.minimumVersion||"mínima indicada",diaImplantacao:dateOnly(f.deploymentStart?.slice(0,10))});
  if(type==="BOLETIM_PERIODICO")Object.assign(map,{responsavel:f.responsible||"a definir",dataPrazo:dateOnly(f.deadline)});
  if(type==="INFORMATIVA_OPERACIONAL")Object.assign(map,{assuntoMaiusculo:(f.subject||"").toUpperCase(),passos:steps(f.steps),prazo:f.deadlineMode==="Não há prazo aplicável"?"Não há prazo aplicável.":(f.deadlineMode||"")+" "+dateOnly(f.deadline)+".",pontosAtencao:bullets(f.attentionPoints)||"▫ Não há pontos de atenção adicionais.",documentacao:f.documentationLink||"Não há documentação específica."});
  return map;
}
export function tokensFor(type:CommunicationType){return Object.keys(values(type,{name:"",acronym:""},2000,{}))}
export function renderTemplate(body:string,type:CommunicationType,team:Identity,year:number,f:Fields) {
  if(!body.trim()||body.length>40000)throw Error("O modelo deve conter de 1 a 40.000 caracteres.");
  if(body.split("{{numero}}").length!==2 || !body.split("\n")[0].includes("{{numero}}"))throw Error("Inclua {{numero}} uma vez no cabeçalho.");
  const vars=values(type,team,year,f);
  const stack=[{key:"",parts:[] as string[]}];
  for(const part of body.split(/(\{\{[^{}]*\}\})/)){
    if(!part)continue;
    const top=stack[stack.length-1];
    if(!part.startsWith("{{")){if(part.includes("{{")||part.includes("}}"))throw Error("Marcador incompleto.");top.parts.push(part);continue;}
    const token=part.slice(2,-2), key=token.replace(/^[#/]/,"");
    if(!Object.hasOwn(vars,key) && key!=="secoes")throw Error("Campo desconhecido: "+key);
    if(token.startsWith("#")){stack.push({key,parts:[]});continue;}
    if(token.startsWith("/")){
      if(top.key!==key||stack.length<2)throw Error("Bloco inválido: "+token);
      stack.pop();
      if(key==="secoes"||vars[key])stack[stack.length-1].parts.push(top.parts.filter(Boolean).join(key==="secoes"?"\n\n":""));
    }else {if(key==="secoes")throw Error("Use secoes como bloco.");top.parts.push(vars[key]);}
  }
  if(stack.length!==1)throw Error("Feche o bloco "+stack[stack.length-1].key+".");
  return stack[0].parts.join("");
}
