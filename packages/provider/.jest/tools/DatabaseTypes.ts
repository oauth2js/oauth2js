import { IAuthorizationCode } from '../../src/interfaces/IAuthorizationCode'
import { IClient } from '../../src/interfaces/IClient'
import { IDeviceCode } from '../../src/interfaces/IDeviceCode'
import { IScope } from '../../src/interfaces/IScope'
import { IUser } from '../../src/interfaces/IUser'
import { TableRecord } from './Database'

export interface Client extends IClient {
  id: string
  secret: string
  type?: string
}

export type DatabaseClient = TableRecord<Client>

export interface Scope extends IScope {
  alias: string
}

export type DatabaseScope = TableRecord<Scope>

export interface User extends IUser {
  username: string
  password: string
  client?: Client
}

export type DatabaseUser = TableRecord<User>

interface DeviceCode extends IDeviceCode {
  user?: User
}

export type DatabaseDeviceCode = TableRecord<DeviceCode>

interface AuthorizationCode extends IAuthorizationCode {
  user: User
}

export type DatabaseAuthorizationCode = TableRecord<AuthorizationCode>
