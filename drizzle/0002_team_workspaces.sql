CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  acronym TEXT COLLATE NOCASE NOT NULL UNIQUE
);
INSERT INTO teams(id,name,acronym) VALUES(1,'Plataforma Socioeducativa','PSE');

CREATE TABLE team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('CONSULTA','COMUNICADOR','ADMIN_TIME')),
  PRIMARY KEY(team_id,user_id)
);
CREATE INDEX team_members_by_user ON team_members(user_id,team_id);
INSERT INTO team_members(team_id,user_id,role)
SELECT 1,id,CASE role WHEN 'ADMIN' THEN 'ADMIN_TIME' ELSE role END FROM users;

CREATE TABLE team_templates (
  team_id INTEGER NOT NULL REFERENCES teams(id),
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY(team_id,type)
);

INSERT INTO team_templates(team_id,type,body) VALUES
(1,'EXTRAORDINARIA','*COMUNICADO EXTRAORDINÁRIO {{sigla}} Nº {{numero}}*

🚨 *ATENÇÃO — {{occurrenceType}}*

📅 {{eventDateTimeDataHora}}

Prezados(as) usuários(as),

Informamos que a {{time}} ({{sigla}}) está apresentando {{occurrenceDescription}}.

A situação pode afetar:

{{affectedItemsLista}}
▫ {{impactedAudience}}.

A equipe técnica já foi acionada e atua com prioridade na identificação da causa e na regularização do serviço.

📌 *Orientação aos usuários*

{{userGuidance}}.{{#incluirIntegridade}}

Até o momento, não há indicativo de perda de dados ou exclusão de informações já registradas. A ocorrência está restrita a {{restricao}}.{{/incluirIntegridade}}

Pedimos desculpas pelos transtornos e agradecemos a compreensão e a colaboração de todos(as).

🎙 *A próxima atualização será divulgada {{nextUpdate}}.*

Problemas diferentes da ocorrência descrita devem ser encaminhados inicialmente ao suporte local do tribunal. Se necessário, registre chamado em:
https://suporteti.cnj.jus.br

*Atenciosamente,*

*Equipe da {{time}} — {{sigla}}*
*Programa Fazendo Justiça — DMF/CNJ*'),
(1,'ATUALIZACAO_VERSAO','*COMUNICADO DE ATUALIZAÇÃO {{sigla}} Nº {{numero}}*

🆕 *ATUALIZAÇÃO DA {{timeMaiusculo}} — VERSÃO {{version}}*

📅 Disponibilização: {{releaseDateTimeDataHora}}

Prezados(as) usuários(as),

Informamos que a versão *{{version}}* da {{time}} ({{sigla}}) será disponibilizada em {{releaseDateTimeDataHora}}.

A atualização contempla as seguintes entregas:

{{#secoes}}{{#newFeatures}}🆕 *Novas funcionalidades*

{{newFeaturesLista}}{{/newFeatures}}{{#improvements}}⚙️ *Melhorias*

{{improvementsLista}}{{/improvements}}{{#fixes}}🛠 *Correções*

{{fixesLista}}{{/fixes}}{{/secoes}}

📌 *Impactos da atualização*

▫ Perfis ou unidades impactados: {{impactedProfiles}};
▫ Processos de negócio impactados: {{businessProcesses}};
▫ Integrações impactadas: {{integrations}}.

📋 *Ação esperada do tribunal*

{{expectedAction}}.{{#atualizarIntegracao}}

⚠️ A utilização da funcionalidade dependerá da atualização do {{componente}} para a versão {{versaoMinima}}. As orientações técnicas serão encaminhadas às equipes de TI dos tribunais.{{/atualizarIntegracao}}

⏱ *Janela de implantação*

A implantação ocorrerá em {{diaImplantacao}}, das {{deploymentStartHora}} às {{deploymentEndHora}}.

Durante esse período, {{availabilityImpact}}.

📚 As orientações de uso estão disponíveis no Manual da {{sigla}}:
https://manual-pse.pdpj.jus.br/

Em caso de dúvida, procure inicialmente o suporte local do tribunal. Se necessário, registre chamado em:
https://suporteti.cnj.jus.br

*Atenciosamente,*

*Equipe da {{time}} — {{sigla}}*
*Programa Fazendo Justiça — DMF/CNJ*'),
(1,'BOLETIM_PERIODICO','*BOLETIM PERIÓDICO {{sigla}} Nº {{numero}}*

📰 *EVOLUÇÃO DA {{timeMaiusculo}}*

📅 Período de referência: {{referencePeriod}}

Prezados(as) usuários(as),

Apresentamos as principais entregas realizadas no período e o andamento das próximas evoluções da {{time}} ({{sigla}}).

✅ *Entregas disponibilizadas*

{{deliveredLista}}

{{#secoes}}{{#inDevelopment}}🚧 *Em desenvolvimento*

{{inDevelopmentLista}}{{/inDevelopment}}{{#inAnalysis}}🔎 *Em análise*

{{inAnalysisLista}}{{/inAnalysis}}{{#priorities}}🗓 *Próximas prioridades*

{{prioritiesLista}}{{/priorities}}{{#deployments}}🔗 *Implantações e integrações*

{{deploymentsLista}}{{/deployments}}{{#attentionActions}}📌 *Ações ou pontos de atenção para os tribunais*

{{attentionActionsLista}}
▫ Responsável: {{responsavel}};
▫ Prazo: {{dataPrazo}}.{{/attentionActions}}{{/secoes}}

⚠️ Os itens classificados como “em desenvolvimento”, “em análise” ou “próximas prioridades” representam o planejamento atual da {{sigla}}. O conteúdo e as previsões poderão ser ajustados conforme decisões negociais, dependências técnicas e prioridades institucionais.

📚 Consulte o Manual da {{sigla}}:
https://manual-pse.pdpj.jus.br/

Em caso de dúvida, procure inicialmente o suporte local do tribunal. Se necessário, registre chamado em:
https://suporteti.cnj.jus.br

*Atenciosamente,*

*Equipe da {{time}} — {{sigla}}*
*Programa Fazendo Justiça — DMF/CNJ*'),
(1,'INFORMATIVA_OPERACIONAL','*COMUNICADO INFORMATIVO {{sigla}} Nº {{numero}}*

📢 *{{assuntoMaiusculo}}*

📅 {{publicationDateData}}

Prezados(as) usuários(as),

Informamos que {{information}}.

👥 *Público-alvo*

{{targetAudience}}

📌 *Orientação*

{{guidance}}{{#steps}}

Quando necessário:

{{passos}}{{/steps}}

⏳ *Prazo*

{{prazo}}

⚠️ *Pontos de atenção*

{{pontosAtencao}}

📚 *Documentação*

As orientações complementares estão disponíveis em:
{{documentacao}}

Manual da {{sigla}}:
https://manual-pse.pdpj.jus.br/

Em caso de dúvida, procure inicialmente o suporte local do tribunal. Se necessário, registre chamado em:
https://suporteti.cnj.jus.br

*Atenciosamente,*

*Equipe da {{time}} — {{sigla}}*
*Programa Fazendo Justiça — DMF/CNJ*');

-- Preserve every communication and its original ID, number, fields, text and author.
DROP TRIGGER communications_assign_number;
ALTER TABLE communications ADD COLUMN team_id INTEGER NOT NULL DEFAULT 1;
DROP INDEX communications_type_year_number_uq;
CREATE UNIQUE INDEX communications_team_number_uq ON communications(team_id,type,year,number);

ALTER TABLE communication_counters RENAME TO legacy_pse_counters;
CREATE TABLE communication_counters (
  team_id INTEGER NOT NULL REFERENCES teams(id), type TEXT NOT NULL, year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(team_id,type,year)
);
INSERT INTO communication_counters(team_id,type,year,last_number)
SELECT 1,type,year,MAX(n) FROM (
  SELECT type,year,last_number AS n FROM legacy_pse_counters
  UNION ALL SELECT type,year,number FROM communications
) GROUP BY type,year;

CREATE TRIGGER communications_assign_number AFTER INSERT ON communications WHEN NEW.number=0 BEGIN
  INSERT INTO communication_counters(team_id,type,year,last_number)
  VALUES(NEW.team_id,NEW.type,NEW.year,1)
  ON CONFLICT(team_id,type,year) DO UPDATE SET last_number=last_number+1;
  UPDATE communications SET
    number=(SELECT last_number FROM communication_counters WHERE team_id=NEW.team_id AND type=NEW.type AND year=NEW.year),
    rendered_message=replace(NEW.rendered_message,'[NN]',printf('%02d',(SELECT last_number FROM communication_counters WHERE team_id=NEW.team_id AND type=NEW.type AND year=NEW.year)))
    WHERE id=NEW.id;
END;
CREATE TRIGGER communications_no_update BEFORE UPDATE ON communications WHEN OLD.number>0 BEGIN
  SELECT RAISE(ABORT,'Comunicado publicado e imutavel');
END;
CREATE TRIGGER communications_no_delete BEFORE DELETE ON communications BEGIN
  SELECT RAISE(ABORT,'Comunicado publicado e imutavel');
END;
