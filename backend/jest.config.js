export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
