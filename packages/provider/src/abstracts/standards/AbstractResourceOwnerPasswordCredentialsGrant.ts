import { Mixed } from '@prunus/mixin'

import {
  DEFAULT_ACCESS_TOKEN_LIFETIME,
  DEFAULT_REFRESH_TOKEN_LIFETIME,
} from '../../helpers/defaults'
import { Maybe, PromiseToo } from '../../helpers/types'
import { IClient } from '../../interfaces/IClient'
import { RequestLocation } from '../../interfaces/IRequest'
import { IScope } from '../../interfaces/IScope'
import { IToken } from '../../interfaces/IToken'
import { IUser } from '../../interfaces/IUser'
import { Context } from '../../models/Context'
import {
  ClientCredentials,
  UseClientByCredentials,
} from '../../traits/UseClientByCredentials'
import { UseClientById } from '../../traits/UseClientById'
import { UseClientPolymorph } from '../../traits/UseClientPolymorph'
import { UseScopes } from '../../traits/UseScopes'
import {
  UserCredentials,
  UseUserByCredentials,
} from '../../traits/UseUserByCredentials'
import { AbstractGrant } from '../AbstractGrant'

export abstract class AbstractResourceOwnerPasswordCredentialsGrant extends Mixed(
  UseClientPolymorph(UseClientByCredentials, UseClientById),
  AbstractGrant,
  UseUserByCredentials,
  UseScopes,
) {
  protected override readonly type = 'password'
  protected readonly scopeLocation = RequestLocation.Body
  protected readonly refreshTokenLifetime = DEFAULT_REFRESH_TOKEN_LIFETIME
  protected readonly accessTokenLifetime = DEFAULT_ACCESS_TOKEN_LIFETIME
  protected readonly userCredentialsLocation: RequestLocation =
    RequestLocation.Body
  protected readonly clientCredentialsLocation: RequestLocation =
    RequestLocation.Body
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Body

  protected async createToken(context: Context): Promise<IToken> {
    const client = await this.getOrLoadClient(context)
    const scopes = await this.getOrLoadScopesObjects(context)
    const user = await this.loadUser(context)

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
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      client,
      scopes,
      user,
    }
  }

  protected abstract override selectUseClientProvider(
    context: Context,
  ): typeof UseClientByCredentials | typeof UseClientById

  protected abstract override getClientByCredentials(
    credentials: ClientCredentials,
    context: Context,
  ): PromiseToo<Maybe<IClient>>

  protected abstract override getClientById(
    clientId: string,
    context: Context,
  ): PromiseToo<Maybe<IClient>>

  protected abstract override getScopesObjects(
    scopes: string[],
    context: Context,
  ): PromiseToo<IScope[]>

  protected abstract override getUserByCredentials(
    credentials: UserCredentials,
    context: Context,
  ): PromiseToo<Maybe<IUser>>

  protected abstract override saveToken(
    token: IToken,
    context: Context,
  ): PromiseToo<IToken>
}
