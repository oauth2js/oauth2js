import { AbstractRefreshTokenGrant } from '../abstracts/standards/AbstractRefreshTokenGrant'
import { ServerError } from '../errors/ServerError'
import { PromiseToo, Maybe } from '../helpers/types'
import { IControllerImplementation } from '../interfaces/IControllerImplementation'
import { IToken } from '../interfaces/IToken'
import { Context } from '../models/Context'

export class RefreshTokenGrant extends AbstractRefreshTokenGrant {
  // @ts-expect-error: The `saveToken` must remain in the constructor implementation but for controller implementation issues it will be redirected to `saveExchangeToken`.
  protected override get saveToken() {
    return super.saveToken
  }
  protected override set saveToken(saveToken) {
    this.saveTokenByRefreshedToken = async function (
      token,
      refreshedToken,
      context,
    ) {
      return saveToken(token, context)
    }
  }

  protected getTokenByRefreshToken(
    refreshToken: string,
    context: Context,
  ): PromiseToo<Maybe<IToken>> {
    throw new ServerError(
      'The `getTokenByRefreshToken` definition is missing from the implementation.',
      context,
    )
  }

  protected saveTokenByRefreshedToken(
    token: IToken,
    refreshedToken: IToken,
    context: Context,
  ): PromiseToo<IToken> {
    throw new ServerError(
      'The `saveTokenByRefreshedToken` definition is missing from the implementation.',
      context,
    )
  }

  protected revokeToken(token: IToken, context: Context): PromiseToo<boolean> {
    throw new ServerError(
      'The `revokeToken` definition is missing from the implementation.',
      context,
    )
  }
}

export interface RefreshTokenGrant
  extends IControllerImplementation<{
    getTokenByRefreshToken(
      refreshToken: string,
      context: Context,
    ): PromiseToo<Maybe<IToken>>
    saveTokenByRefreshedToken(
      token: IToken,
      refreshedToken: IToken,
      context: Context,
    ): PromiseToo<IToken>
    revokeToken(token: IToken, context: Context): PromiseToo<boolean>
    saveToken(token: IToken, context: Context): Promise<IToken>
  }> {}
