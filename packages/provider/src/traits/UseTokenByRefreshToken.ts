import { InvalidGrant } from '../errors/InvalidGrant'
import { InvalidRequest } from '../errors/InvalidRequest'
import { REFRESH_TOKEN_REGEXP } from '../helpers/regexps'
import { Maybe, PromiseToo } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { IToken } from '../interfaces/IToken'
import { Context } from '../models/Context'

export const TOKEN_BY_REFRESH_TOKEN_PROPERTY = Symbol.for(
  'oauth2js:server:context:token-by-refresh-token',
)

export abstract class UseTokenByRefreshToken {
  protected abstract readonly refreshTokenLocation: RequestLocation

  protected getRefreshToken(context: Context): PromiseToo<string> {
    const refreshToken =
      context.request[this.refreshTokenLocation].refresh_token

    if (!refreshToken)
      throw new InvalidRequest('The refresh token is missing', context)

    if (typeof refreshToken !== 'string')
      throw new InvalidRequest(
        `The client id must be of type string but is defined as ${typeof refreshToken}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!REFRESH_TOKEN_REGEXP.test(refreshToken))
      throw new InvalidRequest('The refresh token is invalid', context)

    return refreshToken
  }

  protected async loadRefreshToken(context: Context): Promise<IToken> {
    this.assertToken(
      (context.locals[TOKEN_BY_REFRESH_TOKEN_PROPERTY] =
        await this.getTokenByRefreshToken(
          await this.getRefreshToken(context),
          context,
        )),
      context,
    )

    return context.locals[TOKEN_BY_REFRESH_TOKEN_PROPERTY]
  }

  protected assertToken(
    token: Maybe<IToken>,
    context: Context,
  ): asserts token is IToken {
    if (!token) throw new InvalidGrant('The token is invalid', context)
  }

  protected getOrLoadTokenByRefreshToken(context: Context): PromiseToo<IToken> {
    if (!context.locals[TOKEN_BY_REFRESH_TOKEN_PROPERTY])
      return this.loadRefreshToken(context)
    return context.locals[TOKEN_BY_REFRESH_TOKEN_PROPERTY] as IToken
  }

  protected abstract getTokenByRefreshToken(
    refreshToken: string,
    context: Context,
  ): PromiseToo<Maybe<IToken>>
}
