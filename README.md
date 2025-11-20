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
/cliente   → frontend em React
/servidor  → backend em Node.js
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

- Cadastro e gerenciamento de equipes  
- Registro de provas  
- Pontuação  
- Penalidades  
- Dashboard de desempenho  
