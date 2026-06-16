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
    // pisos. Definidos um pouco abaixo do atual para evitar flakiness; suba-os à
    // medida que mais fluxos (empréstimo/oferta/migração de equipe) forem cobertos.
    coverageThreshold: {
        global: {
            statements: 50,
            branches: 40,
            functions: 42,
            lines: 52,
        },
    },

    transform: {
        '^.+\\.js$': 'babel-jest', 
    },
    
    transformIgnorePatterns: ['/node_modules/'],
};