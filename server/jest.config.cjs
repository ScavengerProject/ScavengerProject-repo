// Para configuração do jest
module.exports = {
    roots: ['<rootDir>/testes'], 
    testRegex: '(/testes/.*|(\\.|/)(test|spec))\\.js$',
    testTimeout: 20000,
    setupFiles: ['<rootDir>/setupTests.js'],
    setupFilesAfterEnv: ['<rootDir>/jestSetupAfterEnv.js'],

    // Cobertura coletada a partir do código de produção (usada no CI).
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/scripts/**',
        '!src/index.js',
    ],
    coverageDirectory: 'coverage',

    // Gate de cobertura (ratchet): o CI falha se a cobertura cair abaixo destes
    // pisos. Ficam ~2 pontos abaixo do medido para absorver flakiness; suba-os à
    // medida que mais fluxos forem cobertos.
    //
    // Medido em 2026-09-07: 75.10 stmts / 67.15 branch / 85.21 funcs / 76.77 lines.
    // Os pisos anteriores (50/40/42/52) deixavam ~25 pontos de folga, o que
    // tornava o gate decorativo: dava para apagar um terço dos testes sem o CI
    // reclamar. Próxima subida ao fim da cobertura de equipes/resultados/
    // penalidades (issue #42).
    coverageThreshold: {
        global: {
            statements: 73,
            branches: 65,
            functions: 83,
            lines: 74,
        },
    },

    transform: {
        '^.+\\.js$': 'babel-jest', 
    },
    
    transformIgnorePatterns: ['/node_modules/'],
};