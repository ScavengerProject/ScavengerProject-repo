# Sistema de Gincana Escolar 

Projeto full-stack desenvolvido em **JavaScript**, utilizando arquitetura **Client/Server**, com frontend em **React (JSX)** e backend em **Node.js + Express**, conectado ao **MongoDB Atlas (Mongo Cloud)**.

Este README descreve como instalar, configurar e executar todo o sistema.

---

## Tecnologias Utilizadas

### **Frontend**
- React (JSX)
- React Router
- Axios


### **Backend**
- Node.js
- Express
- Mongoose (para integração com MongoDB)

### **Banco de Dados**
- MongoDB Atlas

---

## Estrutura do Projeto
```
client/   → frontend em React
├── src/ 
│ ├── components/ # Componentes reutilizáveis de UI (Botões, Inputs, Cards) 
│ ├── hooks/ # Lógica de estado global
│ ├── lib/ # Utilitários
│ ├── pages/ # Páginas principais da aplicação
│ ├── services/ # Chamadas à API 
│ ├── App.jsx # Componente raiz 
│ └── index.css # Estilos globais (importação do Tailwind) 
├── tailwind.config.js # Configuração de temas e plugins do Tailwind 
└── ...

server/  → backend em Node.js
├── src/ 
│ ├── auth/ # Lógica de autenticação e middleware de proteção 
│ ├── config/ # Configuração banco de dados 
│ ├── equipes/ # Controllers e rotas para gestão de equipes 
│ ├── feedbacks/ # Controllers e rotas para gestão de feedbacks 
│ ├── models/ # Schemas do Mongoose (Definição das tabelas/coleções) 
│ ├── notificacoes/ # Controllers e rotas de notificações 
│ ├── penalidades/ # Controllers e rotas para gestão de penalidades 
│ ├── provas/ # Controllers e rotas para gestão de provas
│ ├── resultados/ # Controllers e rotas para gestão de pontuação
│ ├── scripts/ # Scripts utilitários (seed do banco) 
│ ├── usuarios/ # Controllers e rotas para gestão de usuários do sistema 
│ ├── utils/ # Funções auxiliares gerais 
│ └── index.js # Ponto de entrada da aplicação
└── ...
```
Ambos possuem suas próprias dependências e precisam ser instalados separadamente.

---

## Pré-requisitos
Certifique-se de ter instalado:

- **Node.js 18+**
- **npm 9+**
- **Conta no MongoDB Atlas** com connection string

---

## Variáveis de Ambiente

### **Backend (server/.env)**
```
MONGO_URI=<sua-string-de-conexao-mongodb-atlas>
PORT=5000
JWT_SECRET=<sua-chave-secreta>
```
Temos um arquivo de exemplo na pasta: `server/.env.example`.


# 🚀 Como Rodar o Projeto

## 1. Backend (Servidor)
Acesse o diretório do server:
```
cd server
```

Instale as dependências:
```
npm install
```

Inicie o server:
```
npm start
```

O backend será iniciado em:
```
Porta 5000
```

---

## 2. Frontend (Cliente)
Acesse o diretório do frontend:
```
cd client
```

Instale as dependências:
```
npm install
```

Inicie o servidor de desenvolvimento:
```
npm start
```

O frontend irá iniciar em:
```
http://localhost:5173/
```

---

## Comunicação entre Front e Back
O frontend consome a API usando a URL configurada no arquivo `.env`.

Exemplo com Axios:
```js
axios.get(`${import.meta.env.VITE_API_BASE_URL}/equipes`)
```

---

## Banco de Dados
A conexão com o MongoDB é feita via Mongoose:

```js
import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado!"))
  .catch(err => console.error(err));
```

---

## Multi-escola (multi-tenant)

O sistema roda várias escolas na mesma instalação. A hierarquia de escopo é:

```
Escola  ->  Gincana  ->  Equipes / Provas / Resultados / Penalidades / ...
```

Cada entidade de dados já carrega `gincana_id`, e cada `Gincana` pertence a uma
`Escola` via `escola_id` — o isolamento entre escolas é, portanto, transitivo.

### Como o escopo chega ao backend

O front envia dois cabeçalhos em toda requisição (`client/src/services/api.js`):

| Header | Origem no front | Middleware que resolve |
|---|---|---|
| `X-Escola-Id` | `EscolaProvider` (`hooks/useEscola.jsx`) | `resolverEscola` → `req.escolaId` |
| `X-Gincana-Id` | `GincanaProvider` (`hooks/useGincana.jsx`) | `resolverGincana` → `req.gincanaId` |

`resolverGincana` recusa (404) uma gincana que não pertença a `req.escolaId` —
é essa checagem que impede alcançar dados de outra escola trocando o header.

`resolverEscola` faz mais do que validar o tenant: ele resolve o **papel do
usuário naquela escola** e o injeta em `req.usuario.tipo`, substituindo o papel
que veio no token. É por isso que `autorizar('ADMIN')` e os controllers não
precisaram mudar — passaram a ser por escola automaticamente.

Quando o escopo guardado no front não vale mais, a API responde com um `codigo`
que o cliente usa para mandar o usuário escolher de novo:

| `codigo` | Quando acontece | O front faz |
|---|---|---|
| `GINCANA_NAO_SELECIONADA` | trocou de escola e ainda não escolheu uma gincana | vai para `/selecionar-gincana` |
| `GINCANA_ENCERRADA` | a edição ativa foi encerrada (ou o ano virou) | vai para `/selecionar-gincana` |
| `SEM_VINCULO_ESCOLA` / `VINCULO_INATIVO` | perdeu o vínculo com a escola ativa | vai para `/selecionar-escola` |

### Fluxo de entrada

Depois do login o usuário escolhe **escola → gincana → sistema**:

1. `/selecionar-escola` — cards com as escolas do usuário e, em cada uma, o papel
   com que ele vai entrar. Quem tem uma escola só pula esta tela.
2. `/selecionar-gincana` — edições em andamento da escola escolhida. Edições
   **encerradas** (status `ENCERRADA`/`ARQUIVADA` ou de anos passados) aparecem
   listadas como histórico, mas não podem ser abertas — o `resolverGincana`
   recusa o escopo delas. Quem tem uma gincana só pula esta tela.
3. Home normal, com os seletores de escola e gincana na navbar para trocar
   sem passar de novo pelas telas.

### Perfis — o papel é **por escola**

- **SUPER_ADMIN** — global. Único que cadastra escolas e vincula usuários a elas
  (tela *Gerenciar Escolas*). Passa em qualquer `autorizar(...)`, em qualquer escola.
- **ADMIN** — administra apenas as escolas às quais está vinculado.
- Demais perfis — restritos às escolas do seu vínculo.

#### Quantas escolas cada perfil pode ter

| Grupo | Perfis | Escolas |
|---|---|---|
| Organização | `ADMIN`, `PROFESSOR` | **várias** |
| Participante | `ALUNO`, `COORDENADOR`, `PAI/MÃE` | **uma só** |
| Global | `SUPER_ADMIN` | todas (sem vínculo) |

Quem compete pertence a uma escola só: turma, equipe, provas e resultados só
fazem sentido dentro dela, e o mesmo aluno em duas escolas competiria contra si
mesmo. Quem organiza pode acumular — é o caso do professor que toca a gincana de
mais de uma escola.

A lista fica em `PERFIS_MULTI_ESCOLA` (`server/src/models/Usuario.js`) e é o
único lugar a editar para mudar o grupo de um perfil. A regra é aplicada em três
camadas: o schema de `Usuario` (rede de segurança, vale até para scripts), o
helper `conflitoMultiEscola()` usado pelos controllers de escola e de usuário
(devolve **409 `PERFIL_ESCOLA_UNICA`** com a mensagem certa) e o espelho no
front, em `client/src/lib/perfis.js`.

Para mover um aluno de escola, **remova o vínculo antigo antes** de criar o novo
— não existe aluno em duas escolas ao mesmo tempo.

O vínculo fica em `Usuario.vinculos`, um por escola:

```js
vinculos: [
  { escola_id: 'ESCOLA_A', tipo: 'COORDENADOR', turma: 'EF - 6º Ano', status: 'ATIVO' },
  { escola_id: 'ESCOLA_B', tipo: 'ADMIN',       turma: null,          status: 'ATIVO' },
]
```

Uma pessoa tem **um login só**: quem atua em duas escolas é o mesmo cadastro com
dois vínculos, e alterna pelo seletor de escola na navbar. O papel, a turma e o
status são **independentes em cada escola** — rebaixar alguém na escola A não
mexe no papel dela na escola B.

`Usuario.tipo` continua existindo, mas **não é a fonte da verdade dentro de uma
escola**: ele marca o SUPER_ADMIN e serve de padrão herdado ao criar um vínculo
novo (é o que faz um ADMIN continuar ADMIN ao ser vinculado a outra escola).
Para decidir permissão, use `req.usuario.tipo` depois do `resolverEscola`, ou o
helper `papelNaEscola(usuario, escolaId)` de `src/escolas/escolaHelpers.js`.

### Migrando uma base existente

Rode os seeds nesta ordem (todos idempotentes):

```bash
cd server
npm run inventario -- prod               # 0. registre o "antes" (só leitura)
node src/scripts/seedAdmin.js            # 1. admin inicial (pule se já houver ADMIN)
node src/scripts/seedGincanaPrincipal.js # 2. gincana legada
npm run migrar:gincana                   # 3. gincana_id nas coleções antigas
npm run seed:escola                      # 4. escola legada + vínculos
npm run migrar:papeis                    # 5. papel por escola
npm run inventario -- prod               # 6. compare com o "antes"
```

> **Faça backup antes** (`src/scripts/backupProducao.ps1`) e valide-o
> restaurando num banco descartável — o `npm run inventario` serve justamente
> para comparar o restaurado com o original.

O passo 1 é dispensável se o banco já tiver algum ADMIN: o script depende de
`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` e sai sem fazer nada quando já existe
um administrador.

O passo 3 (`migrarDadosParaGincana.js`, sem argumento) preenche `gincana_id` nas
14 coleções escopadas que ainda não tenham o campo. **Ele não é opcional.**
Vários models ganharam `gincana_id` depois que a base já estava em uso
(`Notificacao`, `ProvaUsuario`, `ProvaEquipeParticipacao`, `MigracaoEquipe`,
`OfertaEmprestimo`); o `default: 'GINCANA_PRINCIPAL'` do schema só vale na
escrita, então os documentos antigos continuam **sem o campo** e desaparecem de
qualquer consulta filtrada por gincana. O sintoma é cruel: nada dá erro, os
dados simplesmente somem da interface enquanto seguem intactos no banco.

O passo 4 (`seedEscolaPrincipal.js`) cria a escola `ESCOLA_PRINCIPAL`, vincula
todos os usuários existentes a ela, preenche `escola_id` nas gincanas antigas e
promove o primeiro ADMIN a SUPER_ADMIN — sem ele não há como cadastrar a segunda
escola pela interface. Requisições sem `X-Escola-Id` caem nesse mesmo fallback,
então clientes com cache antigo continuam funcionando.

O passo 5 (`migrarPapeisPorEscola.js`) converte o antigo array `Usuario.escolas`
em `Usuario.vinculos`, herdando o papel/turma/status atuais de cada pessoa —
ninguém muda de perfil por causa da migração — e remove o campo legado. Numa
base que nunca chegou a usar `Usuario.escolas` ele é um no-op: quem cria os
vínculos, nesse caso, é o passo 4.

> **O passo 5 não é opcional.** Enquanto ele não roda, `Usuario.vinculos` fica
> vazio e o `resolverEscola` responde **403 `SEM_VINCULO_ESCOLA`** para todo
> mundo que não é SUPER_ADMIN: o front limpa a escola ativa, manda para
> `/selecionar-escola`, e lá `/escolas/minhas` devolve lista vazia
> ("Nenhuma escola disponível"). É o sintoma de laço na tela de seleção.

Quem estava em mais de uma escola com perfil de participante fica em **uma só**
(a escola da equipe/gincana em que realmente participa; na falta desse sinal, a
primeira da lista). O script imprime no fim quem foi ajustado e de quais escolas
foi removido, para conferência.

---

## 📌 Observações
- Sempre rode **npm install** antes de iniciar o projeto pela primeira vez (cliente e servidor).
- Nunca faça commit dos arquivos `.env` (Eles já estão no **gitignore**).
- Para build de produção (frontend):
```
npm run build
```
- Ajuste CORS no backend caso use domínios externos.

---

## Sobre o Projeto
Este sistema foi desenvolvido pelo grupo de desenvolvedores G7 e, gerenciado pelo grupo de gestores G3 para gerenciar as gincanas escolares, incluindo:

O sistema foi projetado modularmente para cobrir todos os aspectos do evento:

* **Autenticação e Usuários:** Controle de acesso seguro para administradores e participantes.
* **Gestão de Equipes:** Cadastro, edição e visualização dos membros e líderes das equipes.
* **Empréstimo de Alunos:** Solicitação, oferta e gerenciamento de empréstimo de participantes entre equipes.
* **Controle de Provas:** Registro de provas, pontuações e status de conclusão.
* **Penalidades:** Aplicação de punições com desconto automático na pontuação.
* **Ranking:** Dashboard que exibe a pontuação e posição atualizada das equipes.
* **Feedbacks:** Canal de comunicação para registro de observações sobre as provas ou equipes.
* **Notificações:** Alertas para atualizações importantes.
