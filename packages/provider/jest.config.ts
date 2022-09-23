/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
import { Config } from '@jest/types'

const configuration: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
}

export default configuration
