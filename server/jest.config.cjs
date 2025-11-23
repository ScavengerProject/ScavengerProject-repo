// Para configuração do jest
module.exports = {
    roots: ['<rootDir>/testes'], 
    testRegex: '(/testes/.*|(\\.|/)(test|spec))\\.js$',
    testTimeout: 10000, 
    setupFiles: ['<rootDir>/setupTests.js'], 
    
    transform: {
        '^.+\\.js$': 'babel-jest', 
    },
    
    transformIgnorePatterns: ['/node_modules/'],
};