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

