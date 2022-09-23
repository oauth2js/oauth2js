import { AbstractClientCredentialsGrant } from '../abstracts/standards/AbstractClientCredentialsGrant'
import { ServerError } from '../errors/ServerError'
import { PromiseToo, Maybe } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { IControllerImplementation } from '../interfaces/IControllerImplementation'
import { IScope } from '../interfaces/IScope'
import { IToken } from '../interfaces/IToken'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import {
  UseClientByCredentials,
  ClientCredentials,
} from '../traits/UseClientByCredentials'
import { UseClientById } from '../traits/UseClientById'

export class ClientCredentialsGrant extends AbstractClientCredentialsGrant {
  protected selectUseClientProvider(
    context: Context,
  ): typeof UseClientByCredentials | typeof UseClientById {
    if (
      this.getClientByCredentials !==
      ClientCredentialsGrant.prototype.getClientByCredentials
    )
      if (this.getClientById !== ClientCredentialsGrant.prototype.getClientById)
        throw new ServerError(
          'Unable to resolve which client provider to use, conflict when `getClientByCredentials` and `getClientById` are set without a custom `selectUseClientProvider`.',
          context,
        )
      else return UseClientByCredentials

    if (this.getClientById !== ClientCredentialsGrant.prototype.getClientById)
      return UseClientById

    throw new ServerError(
      'Unable to resolve which client provider to use, conflict when neither `getClientByCredentials` nor `getClientById` are defined.',
      context,
    )
  }

  protected getClientByCredentials(
    credentials: ClientCredentials,
    context: Context,
  ): PromiseToo<Maybe<IClient>> {
    throw new ServerError(
      'The `getClientByCredentials` definition is missing from the implementation.',
      context,
    )
  }

  protected getClientById(
    clientId: string,
    context: Context,
  ): PromiseToo<Maybe<IClient>> {
    throw new ServerError(
      'The `getClientById` definition is missing from the implementation.',
      context,
    )
  }

  protected getScopesObjects(
    scopes: string[],
    context: Context,
  ): PromiseToo<IScope[]> {
    throw new ServerError(
      'The `getScopesObjects` definition is missing from the implementation.',
      context,
    )
  }

  protected getUserByClient(
    client: IClient,
    context: Context,
  ): PromiseToo<Maybe<IUser>> {
    throw new ServerError(
      'The `getUserByClient` definition is missing from the implementation.',
      context,
    )
  }

  protected saveToken(token: IToken, context: Context): PromiseToo<IToken> {
    throw new ServerError(
      'The `saveToken` definition is missing from the implementation.',
      context,
    )
  }
}

export interface ClientCredentialsGrant
  extends IControllerImplementation<{
    generateRefreshTokenForClientCredentials: boolean
    getClientByCredentials(
      credentials: ClientCredentials,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getClientById(
      clientId: string,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getScopesObjects(scopes: string[], context: Context): PromiseToo<IScope[]>
    getUserByClient(client: IClient, context: Context): PromiseToo<Maybe<IUser>>
    saveToken(token: IToken, context: Context): PromiseToo<IToken>
  }> {}
