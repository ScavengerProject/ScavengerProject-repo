## Sessão iniciada em 2026-06-03 12:51:13

**Você** [12:51:13]:
você consegue quais issues estão abertas nesse repositório ou nesse projeto?

**Claude** [12:51:50]:
O `gh` CLI não está instalado. Deixa eu tentar outra forma — verificando o remote do repositório e usando a API do GitHub.

**Você** [12:56:14]:
você consegue ir no projeto ao qual esse repositório está associado? o Projects está em outro repo dentro do mesmo projeto. já instalei o gh cli

**Claude** [12:56:27]:
Vamos verificar. Primeiro confirmo a autenticação do `gh` e listo os projetos da organização.

**Você** [12:57:34]:
já fiz login, pode listar os projetos

**Claude** [12:58:07]:
O projeto tem 21 itens. A maioria das issues vive no repo `ScavengerProject-doc`, não neste repo de código. Deixa eu puxar o **status (coluna do Kanban)** de cada um para mostrar o que está em aberto vs. concluído.

**Você** [13:03:03]:
fiz uma reunião com o cliente e anotei alguns pontos. coloque todos eles no backlog de ScavengerProject, no quadro Kanban

**Você** [13:03:17]:
fiz uma reunião com o cliente e anotei alguns pontos. coloque todos eles no backlog de ScavengerProject, no quadro Kanban: feature -> criar testes automatizados para Adicionar no pipeline de CI/CD;

fix -> corrigir o nome de "enviado para aprovação" na hora do cadastro;

change -> possibilitar adicionar no máximo 3 coordenadores (por enquanto há apenas 1 coordenador);

fix -> apagar as contas que nao existe mais (tipo aluno.participante@gmail.com)

change -> deixar os reports de feedback e reclamação apenas para os coordenadores, sem deixar para os participantes;

bug -> verificar o erro ao adicionar membro manualmente pelo administrador

feature -> Adicionar link do drive para mostrar documentos e/ou imagens nas provas;

chore -> verificar se nao ocorre erro na ideia de critérios de elegibilidade

bug -> verificar problema de inscrição de equipe 

feature -> o participante busca migrar de equipe -> o coordenador recebe a solicitação de entrada e verifica se aceita ou não. Primeira vez que o usuario se inscrever em uma equipe, 

feature -> Adicionar 4 coordenadores como máximo, 4 para os equipirados, 3 flamingos e 2 blacks.

feature -> adicionar data de publicação

feature -> adicionar horário para as atividades (que nao existe no momento)

chore -> verificar pontuação que aparece nas provas individuais

**Claude** [13:11:06]:
Todos os 14 itens criados e marcados como **Backlog**. Vou confirmar listando a coluna Backlog do board.

**Você** [14:38:36]:
analise todo o repositório e faça a issue #9 [feature] -> Criar testes automatizados para adicionar ao pipeline de CI/CD. faça testes scripts de testes automatizados (pode mudar tudo em @test/ se achar necessário) e faça também para o pipeline CI/CD do github

**Claude** [15:36:25]:
Everything's clean — all artifacts gone; the `conversation-log.md` files are pre-existing/unrelated. Let me mark the final task done and update the memory to reflect the expanded coverage.

**Você** [16:09:43]:
se eu commitar na dev-ciocca, ele vai realizar o pipeline? ele o CI/CD deve ser realizado sempre que código novo tocar na main

**Claude** [16:19:59]:
Boa pergunta — tem duas partes: **se dispara** e **o que de fato “protege” a main**. Deixa eu confirmar o gatilho atual do workflow.

Os gatilhos hoje (`.github/workflows/ci.yml`):

```yaml
on:
  push:
    branches: [main, release, dev, "dev-*"]
  pull_request:
    branches: [main, release, dev]
```

Respondendo direto:

**1. Commitar na `dev-ciocca` dispara o pipeline?**
Sim — `dev-ciocca` casa com `dev-*`, então um `push` nela roda o CI. **Porém**, com uma ressalva importante: o GitHub Actions só executa um workflow que **já exista naquela branch**. Como o `ci.yml` ainda não foi commitado, nada roda hoje. O **primeiro push que incluir o `ci.yml`** já dispara a partir daí.

**2. “Sempre que código novo tocar na main” — já está coberto?**
Sim:
- `pull_request: [main]` → roda o CI no PR **antes** de fazer merge na main (esse é o gate que importa).
- `push: [main]` → roda também em pushes/merges diretos na main.
- Detalhe: para o evento de PR `dev-ciocca → main`, o GitHub usa o `ci.yml` da branch de origem (head), então funciona desde que a `dev-ciocca` tenha o arquivo.

**3. O ponto crítico que falta (enforcement):**
Rodar o CI ≠ **bloquear** o merge. Para garantir que “código que não passa não entra na main”, é preciso ativar uma **branch protection rule** na main (Settings → Branches → Add rule → *Require status checks to pass before merging* → marcar os checks `Backend - Testes (Jest)` e `Frontend - Testes (Vitest) + Build`). Sem isso, o CI roda e fica vermelho, mas o merge ainda é tecnicamente possível. Isso é configurado na UI do GitHub (não dá pra commitar via arquivo) — posso te passar o passo a passo ou o comando `gh` quando o repo já tiver o workflow.

Sobre o escopo dos gatilhos, há uma decisão sua:

**Você** [17:45:55]:
vamos implementar as features Ready. analise o contexto do projeto e me retorne o que entendeu. analise as issues #18 e #19 e faça um plano para implementar. caso tenha alguma dúvida, pergunte antes de começar a planejar. garanta que está tudo bem claro em termos de entendimento antes de planejar. se eu aprovar, você implementa.

**Claude** [17:55:43]:
Tenho todo o contexto necessário. A infraestrutura BullMQ (fila + worker) já existe, o que viabiliza o agendamento das notificações para a data de publicação. Aqui está o plano completo.

---

# Plano de implementação — Issues #18 e #19

## Visão geral
Ambas mexem na entidade **`Prova`**. Vou tratar: (a) **horário** integrado a `data_inicio`/`data_fim` contando no status (#19) e (b) **`data_publicacao`** como *gate* de visibilidade + disparo de notificações (#18).

---

## #19 — Horário nas atividades

**1. Backend — `calcularStatusProva` (`provaController.js` e cópia em `AdminProvas.jsx`)**
- Remover os overrides `setUTCHours(0,0,0,0)` (início) e `setUTCHours(23,59,59,999)` (fim) para que a **hora** passe a contar na comparação. As duas cópias (back e front) mudam de forma idêntica para manter consistência.
- Provas antigas (só com data, hora 00:00) continuam funcionando — apenas passam a usar meia-noite como referência.

**2. Frontend — `AdminProvas.jsx`**
- Trocar os `<input type="date">` de `data_inicio`/`data_fim` por `type="datetime-local"`.
- Ajustar `handleEdit` (hoje faz `.toISOString().split('T')[0]`) para preencher `YYYY-MM-DDTHH:mm` em horário local.
- No envio, converter o valor para ISO (`new Date(value).toISOString()`) — evita o deslocamento de fuso entre cliente e servidor.
- `formatarData` (lista admin) e `formatarDataCompleta` (`ProvaDetalhesModal.jsx`) passam a exibir também a hora (`toLocaleString` pt-BR).

**Model:** `data_inicio`/`data_fim` já são `Date` — **sem mudança de schema**.

---

## #18 — Data de publicação (controla visibilidade)

**1. Model — `Prova.js`**
- Adicionar `data_publicacao: { type: Date, default: null }`. `null` = publicada imediatamente (comportamento atual preservado).
- Adicionar flag de controle `notificacao_publicacao_enviada: { type: Boolean, default: false }` para impedir disparo duplicado.

**2. Visibilidade (gate) — `provaController.js`**
- Helper `estaPublicada(prova)` → `data_publicacao == null || data_publicacao <= agora`.
- `listarProvas`: para quem **não é ADMIN**, filtrar e devolver só provas publicadas. ADMIN vê todas (com indicação de "agendada").
- `obterProva`: se não publicada e usuário não-ADMIN → `404`.

**3. Notificações na publicação — `provaController.js` + BullMQ**
- Extrair o bloco de notificação/e-mail de `criarProva` para uma função reutilizável `dispatchNotificacoesNovaProva(prova)`.
- Na **criação/edição**:
  - Se já publicada → dispara imediatamente (como hoje) e marca `notificacao_publicacao_enviada = true`.
  - Se publicação futura → **não** dispara; agenda um *delayed job* na `emailQueue` (`tipo: 'PUBLICAR_PROVA'`, `delay = data_publicacao - agora`).
- `emailWorker.js`: novo `case 'PUBLICAR_PROVA'` que recarrega a prova, confere que segue publicada e `notificacao_publicacao_enviada === false`, então chama `dispatchNotificacoesNovaProva` e seta a flag.
- Edição da data: reagenda novo job; a flag + recheck no worker evitam duplicidade.

**4. Camada de serviço/whitelist**
- `provaController.criarProva`: incluir `data_publicacao` no destructure.
- `api.js` (`provasService.criar`/`atualizar`): adicionar `data_publicacao` ao corpo enviado.

**5. Frontend — admin e aluno**
- `AdminProvas.jsx`: novo campo `data_publicacao` (`datetime-local`) no formulário, com texto auxiliar ("deixe em branco para publicar imediatamente"); badge "Agendada para …" nos cards de provas ainda não publicadas.
- Visão aluno (`TodasProvas`, `Dashboard`, `MinhasInscricoes`): nenhuma mudança de filtro necessária além da do backend — elas já consomem `listarProvas`, que passará a ocultar as não publicadas.

---

## Testes
- Atualizar/estender `server/testes/unit/controllers/prova.controller.test.js`: status considerando hora; gate de visibilidade por role; agendamento vs. disparo imediato conforme `data_publicacao`.
- Rodar a suíte Jest (back) e Vitest (front) ao final.

---

## Ponto que quero confirmar antes de codar
O **agendamento via BullMQ** assume que o **worker (`emailWorker.js`) esteja rodando** e que o **Redis** esteja disponível para os *delayed jobs* dispararem na hora certa. É a abordagem que respeita "só notifica na publicação" usando a stack atual.

Se preferir evitar a dependência do worker ativo, a alternativa mais simples é: **não agendar** — a prova fica oculta até a data, mas a notificação/e-mail sai apenas se a publicação já tiver passado no momento de criar/editar (sem disparo automático no futuro). Menos fiel à issue, porém sem depender de processo em background.

**Você** [17:58:27]:
comece agora. prepare os commits (em stage, com git add) quando acabar a primeira das features, para que eu commite manualmente. depois implemente a segunda feat para que eu adicione e commite manualmente depois que revisar. isso é apenas para ter um commit separado para cada issue/feat. eu aceito sugestões de mensagens de commit para cada uma se você quiser

**Claude** [18:11:41]:
Tudo verde: 23 testes no front, build OK (os avisos do Radix e de tamanho de chunk são pré-existentes). **Feature #18 concluída.** Vou conferir a separação git (staged = #19; unstaged/untracked = #18):

