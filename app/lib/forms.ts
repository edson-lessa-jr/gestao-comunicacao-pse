import type {CommunicationType} from "./messages";
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

export const TYPES: Record<CommunicationType,{label:string;short:string;description:string;tone:string}> = {
  EXTRAORDINARIA:{label:"Comunicação extraordinária",short:"Extraordinária",description:"Instabilidade, indisponibilidade ou incidente urgente",tone:"#b42318"},
  ATUALIZACAO_VERSAO:{label:"Atualização de versão",short:"Atualização",description:"Funcionalidades, melhorias e correções disponibilizadas",tone:"#075985"},
  BOLETIM_PERIODICO:{label:"Boletim periódico",short:"Boletim",description:"Evolução da PSE, entregas recentes e roadmap",tone:"#5b21b6"},
  INFORMATIVA_OPERACIONAL:{label:"Informativa / operacional",short:"Informativa",description:"Orientações, procedimentos, prazos e capacitação",tone:"#166534"},
};

export const TYPE_FIELDS: Record<CommunicationType,FieldDefinition[]> = {
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
