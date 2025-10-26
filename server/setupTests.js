const dotenv = require('dotenv');
const path = require('path');

// Carregando as variáveis de ambiente do .env
dotenv.config({ path: path.resolve(__dirname, '.env') });