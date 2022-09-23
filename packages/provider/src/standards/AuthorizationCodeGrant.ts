/* eslint-disable accessor-pairs */
import { OAuth2Error } from '../abstracts/OAuth2Error'
import {
  AbstractAuthorizationCodeFlow,
  AbstractAuthorizationCodeGrant,
} from '../abstracts/standards/AbstractAuthorizationCodeGrant'
import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { IAuthorizationCode } from '../interfaces/IAuthorizationCode'
import { IClient } from '../interfaces/IClient'
import { IControllerImplementation } from '../interfaces/IControllerImplementation'
import { IScope } from '../interfaces/IScope'
import { IToken } from '../interfaces/IToken'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import {
  ClientCredentials,
  UseClientByCredentials,
} from '../traits/UseClientByCredentials'
import { UseClientById } from '../traits/UseClientById'

export class AuthorizationCodeFlow extends AbstractAuthorizationCodeFlow {
  protected selectUseClientProvider(
    context: Context,
  ): typeof UseClientByCredentials | typeof UseClientById {
    if (
      this.getClientByCredentials !==
      AuthorizationCodeFlow.prototype.getClientByCredentials
    )
      if (this.getClientById !== AuthorizationCodeFlow.prototype.getClientById)
        throw new ServerError(
          'Unable to resolve which client provider to use, conflict when `getClientByCredentials` and `getClientById` are set without a custom `selectUseClientProvider`.',
          context,
        )
      else return UseClientByCredentials

    if (this.getClientById !== AuthorizationCodeFlow.prototype.getClientById)
      return UseClientById

    throw new ServerError(
      'Unable to resolve which client provider to use, conflict when neither `getClientByCredentials` nor `getClientById` are defined.',
      context,
    )
  }

  protected saveAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<IAuthorizationCode> {
    throw new ServerError(
      'The `saveAuthorizationCode` definition is missing from the implementation.',
      context,
    )
  }

  protected authorizeAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    user: IUser,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `authorizeAuthorizationCode` definition is missing from the implementation.',
      context,
    )
  }

  protected denyAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `denyAuthorizationCode` definition is missing from the implementation.',
      context,
    )
  }

  protected sendErrorWithInvalidClient(
    error: OAuth2Error,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `sendErrorWithInvalidClient` definition is missing from the implementation.',
      context,
    )
  }

  protected sendErrorWithInvalidRedirectUri(
    error: OAuth2Error,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `sendErrorWithInvalidRedirectUri` definition is missing from the implementation.',
      context,
    )
  }

  protected sendAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `sendAuthorizationCode` definition is missing from the implementation.',
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

  protected getClientByCredentials(
    credentials: ClientCredentials,
    context: Context,
  ): PromiseToo<Maybe<IClient>> {
    throw new ServerError(
      'The `getClientByCredentials` definition is missing from the implementation.',
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
}

export class AuthorizationCodeGrant extends AbstractAuthorizationCodeGrant {
  protected set saveTokenByAuthorizationCode(
    saveTokenByAuthorizationCode: (
      token: IToken,
      authorizationCode: IAuthorizationCode,
      context: Context,
    ) => PromiseToo<IToken>,
  ) {
    this.saveExchangeToken = saveTokenByAuthorizationCode
  }

  protected set saveAuthorizationCode(
    saveAuthorizationCode: (
      authorizationCode: IAuthorizationCode,
      context: Context,
    ) => PromiseToo<IAuthorizationCode>,
  ) {
    this.flow['saveAuthorizationCode'] = saveAuthorizationCode
  }

  protected set authorizeAuthorizationCode(
    authorizeAuthorizationCode: (
      authorizationCode: IAuthorizationCode,
      user: IUser,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['authorizeAuthorizationCode'] = authorizeAuthorizationCode
  }

  protected set denyAuthorizationCode(
    denyAuthorizationCode: (
      authorizationCode: IAuthorizationCode,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['denyAuthorizationCode'] = denyAuthorizationCode
  }

  protected set sendErrorWithInvalidClient(
    sendErrorWithInvalidClient: (
      error: OAuth2Error,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['sendErrorWithInvalidClient'] = sendErrorWithInvalidClient
  }

  protected set sendErrorWithInvalidRedirectUri(
    sendErrorWithInvalidRedirectUri: (
      error: OAuth2Error,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['sendErrorWithInvalidRedirectUri'] =
      sendErrorWithInvalidRedirectUri
  }

  protected set sendAuthorizationCode(
    sendAuthorizationCode: (
      authorizationCode: IAuthorizationCode,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['sendAuthorizationCode'] = sendAuthorizationCode
  }

  protected set getClientById(
    getClientById: (
      clientId: string,
      context: Context,
    ) => PromiseToo<Maybe<IClient>>,
  ) {
    this.flow['getClientById'] = getClientById
  }

  protected set getClientByCredentials(
    getClientByCredentials: (
      credentials: ClientCredentials,
      context: Context,
    ) => PromiseToo<Maybe<IClient>>,
  ) {
    this.flow['getClientByCredentials'] = getClientByCredentials
  }

  protected set getScopesObjects(
    getScopesObjects: (
      scopes: string[],
      context: Context,
    ) => PromiseToo<IScope[]>,
  ) {
    this.flow['getScopesObjects'] = getScopesObjects
  }

  protected flow: AuthorizationCodeFlow = new AuthorizationCodeFlow()

  // @ts-expect-error: The `saveToken` must remain in the constructor implementation but for controller implementation issues it will be redirected to `saveExchangeToken`.
  protected override get saveToken() {
    return super.saveToken
  }

  protected override set saveToken(saveToken) {
    this.saveExchangeToken = async function (token, ticket, context) {
      return saveToken.call(this, token, context)
    }
  }

  protected getUserByAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<Maybe<IUser>> {
    throw new ServerError(
      'The `getUserByAuthorizationCode` definition is missing from the implementation.',
      context,
    )
  }

  protected getAuthorizationCodeByCode(
    code: string,
    context: Context,
  ): PromiseToo<Maybe<IAuthorizationCode>> {
    throw new ServerError(
      'The `getAuthorizationCodeByCode` definition is missing from the implementation.',
      context,
    )
  }

  protected revokeAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<boolean> {
    throw new ServerError(
      'The `revokeAuthorizationCode` definition is missing from the implementation.',
      context,
    )
  }

  protected saveExchangeToken(
    token: IToken,
    ticket: IAuthorizationCode,
    context: Context,
  ): PromiseToo<IToken> {
    throw new ServerError(
      'The `saveExchangeToken` definition is missing from the implementation.',
      context,
    )
  }
}

export interface AuthorizationCodeGrant
  extends IControllerImplementation<{
    getAuthorizationCodeByCode(
      code: string,
      context: Context,
    ): PromiseToo<Maybe<IAuthorizationCode>>
    getUserByAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<Maybe<IUser>>
    revokeAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<boolean>
    saveTokenByAuthorizationCode(
      token: IToken,
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<IToken>
    saveToken(token: IToken, context: Context): PromiseToo<IToken>
    saveAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<IAuthorizationCode>
    authorizeAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      user: IUser,
      context: Context,
    ): PromiseToo<void>
    denyAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<void>
    sendErrorWithInvalidClient(
      error: OAuth2Error,
      context: Context,
    ): PromiseToo<void>
    sendErrorWithInvalidRedirectUri(
      error: OAuth2Error,
      context: Context,
    ): PromiseToo<void>
    sendAuthorizationCode(
      authorizationCode: IAuthorizationCode,
      context: Context,
    ): PromiseToo<void>
    selectUseClientProvider(
      context: Context,
    ): typeof UseClientByCredentials | typeof UseClientById
    getClientById(
      clientId: string,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getClientByCredentials(
      credentials: ClientCredentials,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getScopesObjects(scopes: string[], context: Context): PromiseToo<IScope[]>
  }> {}
