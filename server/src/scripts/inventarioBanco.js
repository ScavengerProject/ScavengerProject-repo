import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Inventário SÓ LEITURA de um banco: contagem de documentos e ÍNDICES por
 * coleção. Complementa o `auditarEscopo.js` — enquanto aquele valida as regras
 * do domínio (escopo, vínculos, papéis), este olha o estado físico do banco.
 *
 * Serve para três coisas numa migração de ambiente:
 *
 *  1. Registrar o "antes". Guarde a saída antes de rodar qualquer seed.
 *  2. Validar um backup: restaure num banco descartável e compare com o "antes"
 *     (`diff antes.txt restaurado.txt`). Backup que não foi restaurado uma vez
 *     não é backup, é um arquivo.
 *  3. Conferir ÍNDICES, que é o risco real de migrar schema no Mongo. O
 *     `autoIndex` do Mongoose cria os índices novos ao subir a aplicação, mas
 *     **nunca remove os obsoletos** — só o `syncIndexes()` dentro dos seeds faz
 *     isso. Antes da migração você deve ver `Equipes` com o unique global
 *     `nome_1`; depois, ele tem que ter virado `nome_1_gincana_id_1`.
 *
 * A saída é determinística (coleções e índices ordenados) justamente para poder
 * ser comparada com `diff` sem falso positivo por ordem de criação.
 *
 * Não escreve nada. Não usa `connectDB()`, que faria `Gincana.syncIndexes()`.
 *
 * Uso (dentro de server/):
 *   npm run inventario                 # banco do NODE_ENV atual
 *   npm run inventario -- prod         # MONGO_URI
 *   npm run inventario -- dev          # MONGO_URI_DEV
 *   npm run inventario -- <nome_db>    # outro banco do mesmo cluster
 */

/** Extrai `{ base, db }` de uma URI, onde `base` já vem sem o nome do banco. */
const partesDaUri = (uri) => {
  const m = (uri || '').match(/^(mongodb(?:\+srv)?:\/\/(?:[^@]*@)?[^/?]+)\/([^?]*)(\?.*)?$/);
  return m ? { base: m[1], db: m[2], query: m[3] || '' } : null;
};

/** Esconde as credenciais para a URI poder ir para o log/terminal. */
const semSegredo = (base) => base.replace(/\/\/[^@]*@/, '//<credenciais>@');

const resolverAlvo = (arg) => {
  const prod = partesDaUri(process.env.MONGO_URI);
  const dev = partesDaUri(process.env.MONGO_URI_DEV);

  // Sem argumento: segue a mesma regra de ambiente do connectDB().
  if (!arg) {
    const ambiente = process.env.NODE_ENV || 'development';
    const alvo = ambiente === 'production' ? prod : dev;
    if (!alvo) throw new Error(`URI não definida para o ambiente "${ambiente}".`);
    return alvo;
  }

  if (arg === 'prod') {
    if (!prod) throw new Error('MONGO_URI não definida no .env.');
    return prod;
  }
  if (arg === 'dev') {
    if (!dev) throw new Error('MONGO_URI_DEV não definida no .env.');
    return dev;
  }

  // Nome de banco arbitrário: reaproveita o cluster/credenciais da MONGO_URI.
  const modelo = prod || dev;
  if (!modelo) throw new Error('Nenhuma URI definida no .env.');
  return { ...modelo, db: arg };
};

const inventariar = async () => {
  const alvo = resolverAlvo(process.argv[2]);
  const uri = `${alvo.base}/${alvo.db}${alvo.query}`;

  console.log(`\nhost     : ${semSegredo(alvo.base)}`);
  console.log(`database : ${alvo.db}`);
  console.log('modo     : SÓ LEITURA\n');

  await mongoose.connect(uri);

  try {
    const conn = mongoose.connection.db;
    const colecoes = (await conn.listCollections().toArray())
      .map((c) => c.name)
      .sort();

    if (colecoes.length === 0) {
      console.log('(nenhuma coleção — o banco está vazio ou não existe)');
      return;
    }

    let total = 0;
    console.log('COLEÇÃO                        DOCS  ÍNDICES');
    console.log('-'.repeat(78));

    for (const nome of colecoes) {
      const n = await conn.collection(nome).countDocuments();
      total += n;

      // `_id_` existe em toda coleção; listá-lo só polui a comparação.
      const indices = (await conn.collection(nome).indexes())
        .filter((i) => i.name !== '_id_')
        .map((i) => (i.unique ? `${i.name} [UNIQUE]` : i.name))
        .sort();

      const rotulo = indices.length > 0 ? indices.join(', ') : '—';
      console.log(`${nome.padEnd(28)} ${String(n).padStart(6)}  ${rotulo}`);
    }

    console.log('-'.repeat(78));
    console.log(`${'TOTAL'.padEnd(28)} ${String(total).padStart(6)}`);
    console.log(`\n${colecoes.length} coleção(ões).`);
  } finally {
    await mongoose.connection.close();
  }
};

inventariar().catch((erro) => {
  console.error('ERRO ao inventariar o banco:', erro.message);
  process.exitCode = 1;
});
