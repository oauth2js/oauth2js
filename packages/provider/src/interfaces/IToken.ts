import { Maybe } from '../helpers/types'
import { IClient } from './IClient'
import { IScope } from './IScope'
import { IUser } from './IUser'

export interface IToken extends OAuth2JS.Server.Token {
  accessToken: string
  accessTokenExpiresAt: Date
  refreshToken: Maybe<string>
  refreshTokenExpiresAt: Maybe<Date>
  scopes: IScope[]
  client: IClient
  user: IUser
}

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Token {}
    }
  }
}
