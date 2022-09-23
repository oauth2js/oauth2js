import { Mixed } from '@prunus/mixin'

import { InvalidClient } from '../../errors/InvalidClient'
import { InvalidGrant } from '../../errors/InvalidGrant'
import {
  DEFAULT_ACCESS_TOKEN_LIFETIME,
  DEFAULT_REFRESH_TOKEN_LIFETIME,
} from '../../helpers/defaults'
import { Maybe, PromiseToo } from '../../helpers/types'
import { RequestLocation } from '../../interfaces/IRequest'
import { IToken } from '../../interfaces/IToken'
import { Context } from '../../models/Context'
import { UseClientId } from '../../traits/UseClientId'
import { UseTokenByRefreshToken } from '../../traits/UseTokenByRefreshToken'
import { AbstractGrant } from '../AbstractGrant'

export abstract class AbstractRefreshTokenGrant extends Mixed(
  AbstractGrant,
  UseTokenByRefreshToken,
  UseClientId,
) {
  protected accessTokenLifetime: number = DEFAULT_ACCESS_TOKEN_LIFETIME
  protected refreshTokenLifetime: number = DEFAULT_REFRESH_TOKEN_LIFETIME
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Body

  protected readonly refreshTokenLocation: RequestLocation =
    RequestLocation.Body

  protected async createToken(context: Context): Promise<IToken> {
    const token = await this.getOrLoadTokenByRefreshToken(context)

    if ((await this.getClientId(context)) !== token.client.id)
      throw new InvalidClient('Client identifier does not match', context)

    const { client, user, scopes } = token
    const [
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
    ] = await Promise.all([
      this.generateAccessToken(context),
      this.getAccessTokenExpiresAt(context),
      this.generateRefreshToken(context),
      this.getRefreshTokenExpiresAt(context),
    ])

    return {
      client,
      user,
      scopes,
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
    }
  }

  protected async saveToken(token: IToken, context: Context): Promise<IToken> {
    return await this.saveTokenByRefreshedToken(
      token,
      await this._revokeToken(context),
      context,
    )
  }

  private async _revokeToken(context: Context) {
    const tokenToRevoke = await this.getOrLoadTokenByRefreshToken(context)

    if (!(await this.revokeToken(tokenToRevoke, context)))
      throw new InvalidGrant('The token is invalid', context)

    return tokenToRevoke
  }

  protected abstract override getTokenByRefreshToken(
    refreshToken: string,
    context: Context,
  ): PromiseToo<Maybe<IToken>>

  protected abstract saveTokenByRefreshedToken(
    token: IToken,
    refreshedToken: IToken,
    context: Context,
  ): PromiseToo<IToken>

  protected abstract revokeToken(
    token: IToken,
    context: Context,
  ): PromiseToo<boolean>
}
