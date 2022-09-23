import { IScope } from './IScope'
import { ITicket } from './ITicket'

export interface IAuthorizationCode extends ITicket {
  code: string
  codeExpiresAt: Date
  redirectUri: string
  state: string | null
  scopes: IScope[]
}
