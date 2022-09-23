/* eslint-disable accessor-pairs */
import {
  AbstractDeviceCodeFlow,
  AbstractDeviceCodeGrant,
} from '../abstracts/standards/AbstractDeviceCodeGrant'
import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { IControllerImplementation } from '../interfaces/IControllerImplementation'
import { IDeviceCode } from '../interfaces/IDeviceCode'
import { IRequest } from '../interfaces/IRequest'
import { IScope } from '../interfaces/IScope'
import { ITicket } from '../interfaces/ITicket'
import { IToken } from '../interfaces/IToken'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import {
  ClientCredentials,
  UseClientByCredentials,
} from '../traits/UseClientByCredentials'
import { UseClientById } from '../traits/UseClientById'

export class DeviceCodeFlow extends AbstractDeviceCodeFlow {
  protected selectUseClientProvider(
    context: Context,
  ): typeof UseClientByCredentials | typeof UseClientById {
    if (
      this.getClientByCredentials !==
      DeviceCodeFlow.prototype.getClientByCredentials
    )
      if (this.getClientById !== DeviceCodeFlow.prototype.getClientById)
        throw new ServerError(
          'Unable to resolve which client provider to use, conflict when `getClientByCredentials` and `getClientById` are set without a custom `selectUseClientProvider`.',
          context,
        )
      else return UseClientByCredentials

    if (this.getClientById !== DeviceCodeFlow.prototype.getClientById)
      return UseClientById

    throw new ServerError(
      'Unable to resolve which client provider to use, conflict when neither `getClientByCredentials` nor `getClientById` are defined.',
      context,
    )
  }

  protected getVerificationUri(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<string> {
    throw new ServerError(
      'The `getVerificationUri` definition is missing from the implementation.',
      context,
    )
  }

  protected getPullingInterval(context: Context): PromiseToo<number> {
    throw new ServerError(
      'The `getPullingInterval` definition is missing from the implementation.',
      context,
    )
  }

  protected saveDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<IDeviceCode> {
    throw new ServerError(
      'The `saveDeviceCode` definition is missing from the implementation.',
      context,
    )
  }

  protected authorizeDeviceCode(
    deviceCode: IDeviceCode,
    user: IUser,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `authorizeDeviceCode` definition is missing from the implementation.',
      context,
    )
  }

  protected denyDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<void> {
    throw new ServerError(
      'The `denyDeviceCode` definition is missing from the implementation.',
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

export class DeviceCodeGrant extends AbstractDeviceCodeGrant {
  protected set pullingInterval(
    pullingInterval: number | ((context: Context) => PromiseToo<number>),
  ) {
    if (
      typeof pullingInterval !== 'function' &&
      typeof pullingInterval !== 'number'
    )
      throw new Error(
        `The 'pullingInterval' definition requires an implementation of type function or number, but is implemented as a ${typeof pullingInterval}`,
      )

    this.getPullingInterval = function (context) {
      if (typeof pullingInterval === 'function')
        return pullingInterval.call(this, context)
      return pullingInterval
    }
  }

  protected set verificationUri(
    verificationUri:
      | string
      | ((deviceCode: IDeviceCode, context: Context) => PromiseToo<string>),
  ) {
    if (
      typeof verificationUri !== 'function' &&
      typeof verificationUri !== 'string'
    )
      throw new Error(
        `The 'verificationUri' definition requires an implementation of type function or string, but is implemented as a ${typeof verificationUri}`,
      )

    this.getVerificationUri = function (
      deviceCode,
      context,
    ): PromiseToo<string> {
      if (typeof verificationUri === 'function')
        return verificationUri.call(this, deviceCode, context)
      return verificationUri
    }
  }

  protected set saveTokenByDeviceCode(
    saveTokenByDeviceCode: (
      token: IToken,
      deviceCode: IDeviceCode,
      context: Context,
    ) => PromiseToo<IToken>,
  ) {
    this.saveExchangeToken = saveTokenByDeviceCode
  }

  // @ts-expect-error: The `getPullingInterval` is shared between the grant and the flow.
  protected get getPullingInterval() {
    return this.flow['getPullingInterval'].bind(this.flow)
  }

  protected set getPullingInterval(getPullingInterval) {
    this.flow['getPullingInterval'] = getPullingInterval
  }

  protected set getVerificationUri(
    getVerificationUri: (
      deviceCode: IDeviceCode,
      context: Context,
    ) => PromiseToo<string>,
  ) {
    this.flow['getVerificationUri'] = getVerificationUri
  }

  protected set saveDeviceCode(
    saveDeviceCode: (
      deviceCode: IDeviceCode,
      context: Context,
    ) => PromiseToo<IDeviceCode>,
  ) {
    this.flow['saveDeviceCode'] = saveDeviceCode
  }

  protected set authorizeDeviceCode(
    authorizeDeviceCode: (
      deviceCode: IDeviceCode,
      user: IUser,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['authorizeDeviceCode'] = authorizeDeviceCode
  }

  protected set denyDeviceCode(
    denyDeviceCode: (
      deviceCode: IDeviceCode,
      context: Context,
    ) => PromiseToo<void>,
  ) {
    this.flow['denyDeviceCode'] = denyDeviceCode
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

  protected flow: DeviceCodeFlow = new DeviceCodeFlow()

  // @ts-expect-error: The `saveToken` must remain in the constructor implementation but for controller implementation issues it will be redirected to `saveExchangeToken`.
  protected override get saveToken() {
    return super.saveToken
  }

  protected override set saveToken(saveToken) {
    this.saveExchangeToken = async function (token, ticket, context) {
      return saveToken.call(this, token, context)
    }
  }

  protected getDeviceCodeByCode(
    code: string,
    context: Context,
  ): PromiseToo<Maybe<IDeviceCode>> {
    throw new ServerError(
      'The `getDeviceCodeByCode` definition is missing from the implementation.',
      context,
    )
  }

  protected getUserByDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<Maybe<IUser | false>> {
    throw new ServerError(
      'The `getUserByDeviceCode` definition is missing from the implementation.',
      context,
    )
  }

  protected getRequestId(
    request: IRequest,
    context: Context,
  ): PromiseToo<Maybe<string>>
  protected getRequestId(): PromiseToo<Maybe<string>> {
    return null
  }

  protected revokeDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<boolean> {
    throw new ServerError(
      'The `revokeDeviceCode` definition is missing from the implementation.',
      context,
    )
  }

  protected saveExchangeToken(
    token: IToken,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken> {
    throw new ServerError(
      'The `saveExchangeToken` definition is missing from the implementation.',
      context,
    )
  }
}

export interface DeviceCodeGrant
  extends IControllerImplementation<{
    pullingInterval: number | ((context: Context) => PromiseToo<number>)
    verificationUri:
      | string
      | ((deviceCode: IDeviceCode, context: Context) => PromiseToo<string>)
    revokeDeviceCode(
      deviceCode: IDeviceCode,
      context: Context,
    ): PromiseToo<boolean>
    saveDeviceCode(
      deviceCode: IDeviceCode,
      context: Context,
    ): PromiseToo<IDeviceCode>
    authorizeDeviceCode(
      deviceCode: IDeviceCode,
      user: IUser,
      context: Context,
    ): PromiseToo<void>
    denyDeviceCode(deviceCode: IDeviceCode, context: Context): PromiseToo<void>
    getClientById(
      clientId: string,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getClientByCredentials(
      credentials: ClientCredentials,
      context: Context,
    ): PromiseToo<Maybe<IClient>>
    getUserByDeviceCode(
      deviceCode: IDeviceCode,
      context: Context,
    ): PromiseToo<Maybe<IUser | false>>
    getScopesObjects(scopes: string[], context: Context): PromiseToo<IScope[]>
    saveTokenByDeviceCode(
      token: IToken,
      deviceCode: IDeviceCode,
      context: Context,
    ): PromiseToo<IToken>
    saveToken(token: IToken, context: Context): PromiseToo<IToken>
    getRequestId(request: IRequest, context: Context): PromiseToo<Maybe<string>>
    getDeviceCodeByCode(
      code: string,
      context: Context,
    ): PromiseToo<Maybe<IDeviceCode>>
  }> {}
