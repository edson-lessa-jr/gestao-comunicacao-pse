# Gestão de Comunicados PSE

Sistema para criar, pré-visualizar, publicar e consultar comunicados da Plataforma Socioeducativa (PSE).

## Funcionalidades

- quatro tipos de comunicado;
- pré-visualização sem consumo de numeração;
- numeração anual independente por tipo;
- publicação definitiva, sem alteração ou cancelamento posterior;
- pesquisa por tipo, número e ano;
- seleção múltipla dos tribunais em implantação;
- autenticação administrativa;
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

## Segurança

O código não contém credenciais. Os comunicados publicados são imutáveis também na API: solicitações de alteração ou cancelamento recebem resposta de conflito.
