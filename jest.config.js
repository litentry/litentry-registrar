module.exports = {
  clearMocks: true,
  resetModules: true,
  testMatch: ['<rootDir>/**/*test.[j|t]s'],
  // coverageDirectory: '<rootDir>/../coverage/',
  // collectCoverageFrom: ['src/**/*.{ts,js,tsx,jsx}'],
  // coveragePathIgnorePatterns: [
  //     '/node_modules/',
  //     '/__fixtures__/',
  //     '/(__)?test(s__)?/',
  //     '/(__)?mock(s__)?/',
  //     '/__jest__/',
  //     '.?.min.js',
  //     '/src/test/',
  // ],
  // coverageThreshold: {
  //     global: {
  //         lines: 80,
  //         statements: 80,
  //     },
  // },
  moduleDirectories: ['node_modules', './'],
  transform: {
      '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  // globals: {
  //     'ts-jest': {
  //         isolatedModules: true,
  //     },
  // },
};
