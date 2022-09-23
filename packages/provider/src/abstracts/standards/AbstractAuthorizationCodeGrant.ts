import { Mixed } from '@prunus/mixin'

import { AccessDenied } from '../../errors/AccessDenied'
import { InvalidClient } from '../../errors/InvalidClient'
import { InvalidGrant } from '../../errors/InvalidGrant'
import { InvalidRequest } from '../../errors/InvalidRequest'
import {
  DEFAULT_ACCESS_TOKEN_LIFETIME,
  DEFAULT_REFRESH_TOKEN_LIFETIME,
} from '../../helpers/defaults'
import { CODE_REGEXP } from '../../helpers/regexps'
import { Maybe, PromiseToo } from '../../helpers/types'
import { IAuthorizationCode } from '../../interfaces/IAuthorizationCode'
import { IClient } from '../../interfaces/IClient'
import { RequestLocation } from '../../interfaces/IRequest'
import { IScope } from '../../interfaces/IScope'
import { ITicket } from '../../interfaces/ITicket'
import { IToken } from '../../interfaces/IToken'
import { IUser } from '../../interfaces/IUser'
import { Context } from '../../models/Context'
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
import { UseRedirectUri } from '../../traits/UseRedirectUri'
import { UseScopes } from '../../traits/UseScopes'
import { UseState } from '../../traits/UseState'
import { UseUserByAuthorizationCode } from '../../traits/UseUserByAuthorizationCode'
import { AbstractExchanger } from '../AbstractExchanger'
import { AbstractFlow } from '../AbstractFlow'
import { OAuth2Error } from '../OAuth2Error'

export abstract class AbstractAuthorizationCodeFlow extends Mixed(
  AbstractFlow,
  UseClientWithRedirectUris(
    UseClientPolymorph(UseClientByCredentials, UseClientById),
  ),
  UseScopes,
  UseRedirectUri,
  UseCodeGenerator,
  UseCodeLifetimeGenerator,
  UseState,
) {
  protected override readonly type = 'code'
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Query
  protected readonly clientCredentialsLocation: RequestLocation =
    RequestLocation.Query
  protected readonly stateLocation: RequestLocation = RequestLocation.Query
  protected readonly allowEmptyState: boolean = false
  protected readonly scopeLocation = RequestLocation.Query
  protected readonly redirectUriLocation = RequestLocation.Query
  protected readonly codeLifetime = 5 * 60 * 1000

  protected override async getRedirectUri(context: Context): Promise<string> {
    const maybeRedirectUri = await super.getRedirectUri(context)

    if (!maybeRedirectUri) return this.getClientDefaultRedirectUri(context)
    return maybeRedirectUri
  }

  protected override assertRedirectUri(
    redirectUri: Maybe<string>,
    context: Context,
  ): asserts redirectUri is string {
    super.assertRedirectUri(redirectUri, context)

    if (!this.getClientRedirectUrisSync(context).includes(redirectUri))
      throw new InvalidRequest(
        'The redirect uri must be whitelisted by the client.',
        context,
      )
  }

  protected async createTicket(context: Context): Promise<IAuthorizationCode> {
    const client = await this.getOrLoadClient(context)
    const redirectUri = await this.getOrLoadRedirectUri(context)
    const scopes = await this.getOrLoadScopesObjects(context)
    const [code, codeExpiresAt, state] = await Promise.all([
      this.generateCode(context),
      this.getCodeExpiresAt(context),
      this.getState(context),
    ])

    return { client, code, codeExpiresAt, scopes, redirectUri, state }
  }

  protected async release(ticket: IAuthorizationCode, context: Context) {
    const authorizationCode = await this.saveAuthorizationCode(ticket, context)

    await this.sendAuthorizationCode(authorizationCode, context)
  }

  protected buildURI(uri: string, context: Context): PromiseToo<URL>
  protected buildURI(uri: string): PromiseToo<URL> {
    const data = new URL(uri)

    data.search = ''
    return data
  }

  protected redirect(uri: URL, context: Context) {
    context.response.setHeader('Location', uri.toString())
    context.response.status(302)
    context.response.send()
  }

  protected async authorize(
    ticket: IAuthorizationCode,
    user: IUser,
    context: Context,
  ): Promise<void> {
    await this.authorizeAuthorizationCode(ticket, user, context)

    const uri = await this.buildURI(ticket.redirectUri, context)

    uri.searchParams.set('code', ticket.code)
    if (ticket.state) uri.searchParams.set('state', ticket.state)
    this.redirect(uri, context)
  }

  protected async deny(
    ticket: IAuthorizationCode,
    context: Context,
  ): Promise<void> {
    await this.denyAuthorizationCode(ticket, context)
    throw new AccessDenied('Access is denied', context)
  }

  protected async releaseError(error: OAuth2Error, context: Context) {
    if (error instanceof InvalidClient)
      await this.sendErrorWithInvalidClient(error, context)

    try {
      await this.getOrLoadClient(context)
    } catch {
      return await this.sendErrorWithInvalidClient(error, context)
    }

    try {
      const redirectUri = await this.getOrLoadRedirectUri(context)
      const uri = await this.buildURI(redirectUri, context)

      uri.searchParams.set('error', error.error)
      uri.searchParams.set('error_description', error.description)
      this.redirect(uri, context)
    } catch {
      await this.sendErrorWithInvalidRedirectUri(error, context)
    }
  }

  protected async authorizeError(
    error: OAuth2Error,
    ticket: IAuthorizationCode,
    user: IUser,
    context: Context,
  ) {
    const uri = await this.buildURI(ticket.redirectUri, context)

    uri.searchParams.set('error', error.error)
    uri.searchParams.set('error_description', error.description)
    this.redirect(uri, context)
  }

  protected async denyError(
    error: OAuth2Error,
    ticket: IAuthorizationCode,
    context: Context,
  ) {
    const uri = await this.buildURI(ticket.redirectUri, context)

    uri.searchParams.set('error', error.error)
    uri.searchParams.set('error_description', error.description)
    this.redirect(uri, context)
  }

  protected abstract saveAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<IAuthorizationCode>

  protected abstract authorizeAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    user: IUser,
    context: Context,
  ): PromiseToo<void>

  protected abstract denyAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<void>

  protected abstract sendErrorWithInvalidClient(
    error: OAuth2Error,
    context: Context,
  ): PromiseToo<void>

  protected abstract sendErrorWithInvalidRedirectUri(
    error: OAuth2Error,
    context: Context,
  ): PromiseToo<void>

  protected abstract sendAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<void>

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
}

const ClassMix = Mixed(
  AbstractExchanger,
  UseRedirectUri,
  UseClientId,
  UseUserByAuthorizationCode,
)

export abstract class TT extends ClassMix {}

export abstract class AbstractAuthorizationCodeGrant extends Mixed(
  AbstractExchanger,
  UseRedirectUri,
  UseClientId,
  UseUserByAuthorizationCode,
) {
  protected readonly refreshTokenLifetime = DEFAULT_REFRESH_TOKEN_LIFETIME
  protected readonly accessTokenLifetime = DEFAULT_ACCESS_TOKEN_LIFETIME
  protected readonly clientIdLocation: RequestLocation = RequestLocation.Body
  protected readonly redirectUriLocation: RequestLocation = RequestLocation.Body

  protected abstract override readonly flow: AbstractAuthorizationCodeFlow

  protected revokeTicket(
    ticket: IAuthorizationCode,
    context: Context,
  ): PromiseToo<boolean> {
    return this.revokeAuthorizationCode(ticket, context)
  }

  protected getAuthorizationCode(
    context: Context,
  ): PromiseToo<IAuthorizationCode> {
    return this.getOrLoadTicket(context) as PromiseToo<IAuthorizationCode>
  }

  protected async exchangeTicketByToken(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): Promise<IToken> {
    if ((await this.getClientId(context)) !== authorizationCode.client.id)
      throw new InvalidClient('Client identifier does not match', context)

    if ((await this.getRedirectUri(context)) !== authorizationCode.redirectUri)
      throw new InvalidGrant('Redirect uri does not match', context)

    const client = authorizationCode.client

    const user = await this.getOrLoadUser(context)

    const scopes = authorizationCode.scopes

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

  protected getCode(context: Context): PromiseToo<string> {
    if (!context.request.body.code)
      throw new InvalidRequest('The code is missing', context)

    if (typeof context.request.body.code !== 'string')
      throw new InvalidRequest(
        `The code must be of type string but is defined as ${typeof context
          .request.body.code}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!CODE_REGEXP.test(context.request.body.code))
      throw new InvalidRequest('The code is invalid', context)

    return context.request.body.code
  }

  protected async getTicket(context: Context): Promise<Maybe<ITicket>> {
    const code = await this.getCode(context)

    return this.getAuthorizationCodeByCode(code, context)
  }

  protected abstract override saveExchangeToken(
    token: IToken,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>

  protected abstract getAuthorizationCodeByCode(
    code: string,
    context: Context,
  ): PromiseToo<Maybe<IAuthorizationCode>>

  protected abstract revokeAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<boolean>
}
