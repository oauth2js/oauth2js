import { IScope } from './IScope'
import { ITicket } from './ITicket'

export interface IDeviceCode extends ITicket {
  code: string
  codeExpiresAt: Date
  userCode: string
  scopes: IScope[]
}
