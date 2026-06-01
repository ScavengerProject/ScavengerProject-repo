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
