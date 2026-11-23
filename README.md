# Gestão de Comunicados PSE

Sistema para criar, pré-visualizar, publicar e consultar comunicados da Plataforma Socioeducativa (PSE).

## Funcionalidades

- quatro tipos de comunicado;
- pré-visualização sem consumo de numeração;
- numeração anual independente por tipo;
- publicação definitiva, sem alteração ou cancelamento posterior;
- pesquisa por tipo, número e ano;
- seleção múltipla dos tribunais em implantação;
- autenticação por usuário com perfis de Consulta, Comunicador e Administrador;
- gestão de usuários pelo administrador, com ativação, inativação e redefinição de senha;
- edição do texto final antes da publicação;
- mensagens formatadas para divulgação no WhatsApp.

## Arquitetura

- Next.js;
- Cloudflare Workers com OpenNext;
- Cloudflare D1;
- Drizzle para o esquema do banco.

## Publicação inicial

### 1. Criar o banco D1

No painel da Cloudflare, acesse **Storage & Databases > D1 SQL Database** e crie um banco chamado `gestao-comunicacao-pse`.

O vínculo `DB` e o identificador do banco estão configurados em `wrangler.jsonc`.

### 2. Criar as tabelas

O comando de implantação executa automaticamente as migrações pendentes antes de publicar a aplicação. O primeiro deploy criará as tabelas necessárias.

### 3. Configurar os segredos

No Worker, abra **Settings > Variables and Secrets** e crie os seguintes segredos criptografados:

- `PSE_ADMIN_USER`;
- `PSE_ADMIN_PASSWORD`;
- `PSE_SESSION_SECRET` — use uma sequência aleatória longa.

Nunca inclua os valores desses segredos no repositório.

### 4. Conectar o GitHub

No painel da Cloudflare:

1. abra **Workers & Pages**;
2. selecione **Create application**;
3. selecione **Import a repository**;
4. autorize o GitHub e escolha este repositório;
5. use `main` como branch de produção;
6. mantenha `/` como diretório raiz;
7. deixe o comando de build vazio;
8. use `npm run deploy` como comando de implantação.

Cada atualização da branch `main` iniciará uma nova implantação.

## Desenvolvimento local

```bash
npm ci
npm run db:migrate:local
npm run dev
```

Para testar no runtime da Cloudflare:

```bash
npm run preview
```

## Times, integrantes e modelos

Após o login, selecione o time ativo (quando houver apenas um, ele abre automaticamente). O administrador geral vê todos os times e pode usar **Criar time**, informando nome e sigla. Em **Integrantes**, crie uma conta ou vincule um login existente e atribua o perfil local:

- **Consulta**: consulta e copia apenas os comunicados do time.
- **Comunicador**: também prepara, revisa e publica.
- **Administrador de time**: também administra integrantes e os quatro textos em **Modelos do time**. Retirar um integrante não desativa sua conta em outros times.
- **Administrador geral**: administra todos os times, inclusive os novos, e as **Contas globais**. Dados de login, senha e situação da conta existente não podem ser alterados por um administrador local.

Cada time recebe uma cópia dos quatro modelos originais. O editor aceita os campos fixos do formulário e os marcadores de identidade `{{time}}`, `{{sigla}}` e `{{numero}}`. A prévia é editável e não consome número. Na publicação, o texto é congelado. A sequência é independente por time, tipo e ano (Brasília).

## Atualização de instalações existentes

A migração D1 `0002_team_workspaces.sql` cria o time Plataforma Socioeducativa (PSE), vincula os usuários existentes e preserva os identificadores, a autoria e o conteúdo publicado. Administradores gerais existentes mantêm o acesso geral; demais usuários conservam o seu perfil na PSE. Para cada tipo/ano, continua a partir do maior valor entre o contador anterior e os números publicados. Não execute SQL de limpeza nem recrie o banco. Após ativar outros times, não reverta o Worker para uma versão sem isolamento por time.

## Validação local

`node --test tests/teams-migration.test.mjs` valida preservação e numeração em SQLite em memória. A migração pode ser exercitada no D1 local com `npm run db:migrate:local`.
