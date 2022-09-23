/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
import { Config } from '@jest/types'

const configuration: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: ['<rootDir>/packages/*'],
  coveragePathIgnorePatterns: ['/.jest/', '<rootDir>/node_modules/'],
  coverageReporters: ['lcovonly', 'text'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {},
  },
}

export default configuration
