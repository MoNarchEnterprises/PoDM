import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/../PoDM_project/common/types/$1',
  },
  transform: {
    '^.+\.(ts|tsx|js|jsx)$' : 'babel-jest',
  },};

export default config;