import { AbstractTokenType } from '../abstracts/AbstractTokenType'
import { IToken } from '../interfaces/IToken'

export class TokenBearerType extends AbstractTokenType {
  public toJSON(token: IToken): Record<string, unknown> {
    return {
      access_token: token.accessToken,
      token_type: 'Bearer',
      expires_in: Math.round(
        (token.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
      ),
      refresh_token: token.refreshToken,
    }
  }
}
