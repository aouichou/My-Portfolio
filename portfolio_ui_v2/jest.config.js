/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/unit/**/*.[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // CSS import inside LiveTerminal is a no-op under jest.
    '\\.(css)$': '<rootDir>/__tests__/helpers/style-mock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/api-v2.ts', // pure type module — no runtime to cover
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
};
