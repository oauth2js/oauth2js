import { Mixed } from '@prunus/mixin'

import { AuthorizationPending } from '../../errors/AuthorizationPending'
import { InvalidClient } from '../../errors/InvalidClient'
import { InvalidRequest } from '../../errors/InvalidRequest'
import { SlowDown } from '../../errors/SlowDown'
import {
  DEFAULT_ACCESS_TOKEN_LIFETIME,
  DEFAULT_DEVICE_CODE_LIFETIME,
  DEFAULT_REFRESH_TOKEN_LIFETIME,
} from '../../helpers/defaults'
import { CODE_REGEXP } from '../../helpers/regexps'
import { Maybe, PromiseToo } from '../../helpers/types'
import { IClient } from '../../interfaces/IClient'
import { IDeviceCode } from '../../interfaces/IDeviceCode'
import { IRequest, RequestLocation } from '../../interfaces/IRequest'
import { IScope } from '../../interfaces/IScope'
import { ITicket } from '../../interfaces/ITicket'
import { IToken } from '../../interfaces/IToken'
import { IUser } from '../../interfaces/IUser'
import { Context } from '../../models/Context'
import { generateHumanWritableCode } from '../../tools/generateHumanWritableCode'
import {
  ClientCredentials,
  UseClientByCredentials,
} from '../../traits/UseClientByCredentials'
import { UseClientById } from '../../traits/UseClientById'
import { UseClientId } from '../../traits/UseClientId'
import { UseClientPolymorph } from '../../traits/UseClientPolymorph'
import { UseClientWithRedirectUris } from '../../traits/UseClientWithRedirectUris'
import { UseCodeGenerator } from '../../traits/UseCodeGenerator'
import { UseCodeLifetimeGenerator } from '../../traits/UseCodeLifetimeGenerator'
import { UseScopes } from '../../traits/UseScopes'
import { UseUserByDeviceCode } from '../../traits/UseUserByDeviceCode'
import { AbstractExchanger } from '../AbstractExchanger'
import { AbstractFlow } from '../AbstractFlow'
import { OAuth2Error } from '../OAuth2Error'

export abstract class AbstractDeviceCodeFlow extends Mixed(
  AbstractFlow,
  UseClientWithRedirectUris(
    UseClientPolymorph(UseClientByCredentials, UseClientById),
  ),
  UseScopes,
  UseCodeGenerator,
  UseCodeLifetimeGenerator,
) {
  protected override readonly type = 'device_code'
  protected readonly scopeLocation = RequestLocation.Body
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Body
  protected readonly clientCredentialsLocation: RequestLocation =
    RequestLocation.Body
  protected readonly codeLifetime = DEFAULT_DEVICE_CODE_LIFETIME

  protected getVerificationUriComplete(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<Maybe<string>>
  protected getVerificationUriComplete(): PromiseToo<Maybe<string>> {
    return null
  }

  protected generateUserCode(context: Context): PromiseToo<string>
  protected generateUserCode(): PromiseToo<string> {
    return generateHumanWritableCode()
  }

  protected async createTicket(context: Context): Promise<IDeviceCode> {
    const client = await this.getOrLoadClient(context)
    const scopes = await this.getOrLoadScopesObjects(context)
    const [code, codeExpiresAt] = await Promise.all([
      this.generateCode(context),
      this.getCodeExpiresAt(context),
    ])
    const userCode = await this.generateUserCode(context)

    return { client, code, codeExpiresAt, scopes, userCode }
  }

  protected async release(ticket: IDeviceCode, context: Context) {
    const deviceCode = await this.saveDeviceCode(ticket, context)
    const pullingInterval = await this.getPullingInterval(context)
    const verificationUri = await this.getVerificationUri(deviceCode, context)
    const verificationUriComplete = await this.getVerificationUriComplete(
      deviceCode,
      context,
    )

    context.response.status(200)
    context.response.setHeader('Content-Type', 'application/json')
    context.response.send(
      JSON.stringify({
        device_code: deviceCode.code,
        user_code: deviceCode.userCode,
        verification_uri: verificationUri,
        verification_uri_complete: verificationUriComplete,
        expires_in: Math.round(
          (deviceCode.codeExpiresAt.getTime() - Date.now()) / 1000,
        ),
        interval: pullingInterval,
      }),
    )
  }

  protected async authorize(
    deviceCode: IDeviceCode,
    user: IUser,
    context: Context,
  ): Promise<void> {
    await this.authorizeDeviceCode(deviceCode, user, context)
    context.response.status(204)
    context.response.send()
  }

  protected async deny(
    deviceCode: IDeviceCode,
    context: Context,
  ): Promise<void> {
    await this.denyDeviceCode(deviceCode, context)
    context.response.status(204)
    context.response.send()
  }

  protected releaseError(error: OAuth2Error, context: Context) {
    context.response.status(error.status)
    context.response.setHeader('Content-Type', 'application/json')
    context.response.send(
      JSON.stringify({
        error: error.error,
        error_description: error.description,
        error_uri: null,
      }),
    )
  }

  protected authorizeError(
    error: OAuth2Error,
    ticket: IDeviceCode,
    user: IUser,
    context: Context,
  ) {
    context.response.status(error.status)
    context.response.setHeader('Content-Type', 'application/json')
    context.response.send(
      JSON.stringify({
        error: error.error,
        error_description: error.description,
        error_uri: null,
      }),
    )
  }

  protected denyError(
    error: OAuth2Error,
    ticket: IDeviceCode,
    context: Context,
  ) {
    context.response.status(error.status)
    context.response.setHeader('Content-Type', 'application/json')
    context.response.send(
      JSON.stringify({
        error: error.error,
        error_description: error.description,
        error_uri: null,
      }),
    )
  }

  protected abstract override selectUseClientProvider(
    context: Context,
  ): typeof UseClientByCredentials | typeof UseClientById

  protected abstract override getClientById(
    clientId: string,
    context: Context,
  ): PromiseToo<Maybe<IClient>>

  protected abstract override getClientByCredentials(
    credentials: ClientCredentials,
    context: Context,
  ): PromiseToo<Maybe<IClient>>

  protected abstract override getScopesObjects(
    scopes: string[],
    context: Context,
  ): PromiseToo<IScope[]>

  protected abstract getVerificationUri(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<string>

  protected abstract getPullingInterval(context: Context): PromiseToo<number>

  protected abstract saveDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<IDeviceCode>

  protected abstract authorizeDeviceCode(
    deviceCode: IDeviceCode,
    user: IUser,
    context: Context,
  ): PromiseToo<void>

  protected abstract denyDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<void>
}

export interface DeviceCodeGrantRequestTimeStorage {
  get(key: string): PromiseToo<string | undefined>
  set(key: string, value: string): PromiseToo<unknown>
  delete(key: string): PromiseToo<unknown>
}

export abstract class AbstractDeviceCodeGrant extends Mixed(
  AbstractExchanger,
  UseClientId,
  UseUserByDeviceCode,
) {
  protected readonly refreshTokenLifetime = DEFAULT_REFRESH_TOKEN_LIFETIME
  protected readonly accessTokenLifetime = DEFAULT_ACCESS_TOKEN_LIFETIME
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Body
  protected readonly requestTimeStorage: DeviceCodeGrantRequestTimeStorage =
    new Map<string, string>()
  protected override readonly type =
    'urn:ietf:params:oauth:grant-type:device_code'

  protected abstract override readonly flow: AbstractDeviceCodeFlow

  protected override assertUser(
    user: Maybe<IUser | false>,
    context: Context,
  ): asserts user is IUser {
    if (user === false)
      throw new AuthorizationPending('Authorization is pending', context)
    return super.assertUser(user, context)
  }

  protected getDeviceCode(context: Context): PromiseToo<IDeviceCode> {
    return this.getOrLoadTicket(context) as PromiseToo<IDeviceCode>
  }

  protected async exchangeTicketByToken(
    deviceCode: IDeviceCode,
    context: Context,
  ): Promise<IToken> {
    if ((await this.getClientId(context)) !== deviceCode.client.id)
      throw new InvalidClient('Client identifier does not match', context)

    const client = deviceCode.client

    const user = await this.getOrLoadUser(context)

    const scopes = deviceCode.scopes

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
      user,
      client,
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      scopes,
    }
  }

  protected revokeTicket(
    ticket: IDeviceCode,
    context: Context,
  ): PromiseToo<boolean> {
    return this.revokeDeviceCode(ticket, context)
  }

  protected createRequestTimeStorageKey(
    requestId: string,
    context: Context,
  ): PromiseToo<string>
  protected createRequestTimeStorageKey(requestId: string): PromiseToo<string> {
    return `oauth2js:grant:device-code:pulling:${requestId}`
  }

  protected async assertRequestPullingInterval(context: Context) {
    const now = new Date()
    const requestId = await this.getRequestId(context.request, context)

    if (!requestId) return void 0

    const requestTimeStorageKey = await this.createRequestTimeStorageKey(
      requestId,
      context,
    )

    const dateStringOfTheLastRequest = await this.requestTimeStorage.get(
      requestTimeStorageKey,
    )

    const pullingInterval = await this.getPullingInterval(context)

    if (dateStringOfTheLastRequest) {
      const dateOfTheLastRequest = new Date(dateStringOfTheLastRequest)
      const minDateExpected = new Date(
        dateOfTheLastRequest.getTime() + pullingInterval,
      )

      if (now < minDateExpected) throw new SlowDown('Slow down', context)
    }

    this.requestTimeStorage.set(requestTimeStorageKey, new Date().toISOString())

    setTimeout(
      () =>
        (async () => {
          const currentDateStringOfTheLastRequest =
            await this.requestTimeStorage.get(requestTimeStorageKey)

          if (currentDateStringOfTheLastRequest === dateStringOfTheLastRequest)
            await this.requestTimeStorage.delete(requestTimeStorageKey)
        })(),
      pullingInterval,
    )
  }

  protected override async createToken(context: Context) {
    await this.assertRequestPullingInterval(context)

    return super.createToken(context)
  }

  protected getCode(context: Context): PromiseToo<string> {
    if (!context.request.body.device_code)
      throw new InvalidRequest('The device code is missing', context)

    if (typeof context.request.body.device_code !== 'string')
      throw new InvalidRequest(
        `The device code must be of type string but is defined as ${typeof context
          .request.body.device_code}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!CODE_REGEXP.test(context.request.body.device_code))
      throw new InvalidRequest('The device code is invalid', context)

    return context.request.body.device_code
  }

  protected async getTicket(context: Context): Promise<Maybe<ITicket>> {
    const code = await this.getCode(context)

    return this.getDeviceCodeByCode(code, context)
  }

  protected abstract override saveExchangeToken(
    token: IToken,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>

  protected abstract getPullingInterval(context: Context): PromiseToo<number>

  protected abstract getRequestId(
    request: IRequest,
    context: Context,
  ): PromiseToo<Maybe<string>>

  protected abstract getDeviceCodeByCode(
    code: string,
    context: Context,
  ): PromiseToo<Maybe<IDeviceCode>>

  protected abstract revokeDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<boolean>

  protected abstract override getUserByDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<Maybe<IUser | false>>
}
