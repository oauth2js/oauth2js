import { InvalidRequest } from '../errors/InvalidRequest'
import { ServerError } from '../errors/ServerError'
import {
  ACCESS_TOKEN_REGEXP,
  CLIENT_ID_REGEXP,
  CLIENT_SECRET_REGEXP,
} from '../helpers/regexps'
import { PromiseToo, Maybe } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'
import { UseClient } from './UseClient'

export interface ClientCredentials {
  id: string
  secret: string
}

export abstract class UseClientByCredentials extends UseClient {
  private static BASIC_AUTHORIZATION_REGEXP =
    /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +(?<token>[0-z._~+/-]+=*) *$/
  private static CREDENTIALS_REGEXP = /^(?<name>[^:]*):(?<pass>.*)$/

  protected abstract readonly clientCredentialsLocation: RequestLocation

  protected getClientBasicAuthorization(context: Context) {
    return context.request.headers.Authorization
  }

  protected getClientCredentialsInAuthorizationHeader(
    context: Context,
  ): PromiseToo<ClientCredentials> {
    const location = this.clientCredentialsLocation

    if (!(location in context.request))
      throw new ServerError('Location not included in the request', context)

    if (context.request[location].client_id)
      throw new InvalidRequest(
        'It is not allowed to try two means of authentication in the same request.',
        context,
      )

    if (context.request[location].client_secret)
      throw new InvalidRequest(
        'It is not allowed to try two means of authentication in the same request.',
        context,
      )

    const authorization = this.getClientBasicAuthorization(context)

    if (!authorization)
      throw new InvalidRequest('Invalid authorization', context)

    if (typeof authorization !== 'string')
      throw new InvalidRequest('Invalid authorization', context)

    const { token } =
      UseClientByCredentials.BASIC_AUTHORIZATION_REGEXP.exec(authorization)
        ?.groups ?? {}

    if (!token) throw new InvalidRequest('Invalid authorization', context)

    // TODO: Invalid request or grant?
    if (!ACCESS_TOKEN_REGEXP.test(token))
      throw new InvalidRequest('Invalid authorization', context)

    const { name: id, pass: secret } =
      UseClientByCredentials.CREDENTIALS_REGEXP.exec(
        Buffer.from(token, 'base64').toString('utf-8'),
      )?.groups ?? {}

    if (!id || !secret)
      throw new InvalidRequest('Invalid authorization', context)

    // TODO: Invalid request or grant?
    if (!CLIENT_ID_REGEXP.test(id))
      throw new InvalidRequest('Invalid authorization', context)

    // TODO: Invalid request or grant?
    if (!CLIENT_SECRET_REGEXP.test(secret))
      throw new InvalidRequest('Invalid authorization', context)

    return { id, secret }
  }

  protected getClientCredentialsInRequestLocation(context: Context) {
    if (this.getClientBasicAuthorization(context))
      throw new InvalidRequest(
        'It is not allowed to try two means of authentication in the same request.',
        context,
      )

    const location = this.clientCredentialsLocation

    if (!(location in context.request))
      throw new ServerError('Location not included in the request', context)

    if (!context.request[location].client_id)
      throw new InvalidRequest('The client id is missing', context)

    if (typeof context.request[location].client_id !== 'string')
      throw new InvalidRequest(
        `The client id must be of type string but is defined as ${typeof context
          .request[location].client_id}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!CLIENT_ID_REGEXP.test(context.request[location].client_id as string))
      throw new InvalidRequest('The client id is invalid', context)

    if (!context.request[location].client_secret)
      throw new InvalidRequest('The client secret is missing', context)

    if (typeof context.request[location].client_secret !== 'string')
      throw new InvalidRequest(
        `The client secret must be of type string but is defined as ${typeof context
          .request[location].client_secret}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (
      !CLIENT_SECRET_REGEXP.test(
        context.request[location].client_secret as string,
      )
    )
      throw new InvalidRequest('The client secret is invalid', context)

    const credentials: ClientCredentials = {
      id: context.request[this.clientCredentialsLocation].client_id as string,
      secret: context.request[this.clientCredentialsLocation]
        .client_secret as string,
    }

    return credentials
  }

  protected getClientCredentials(
    context: Context,
  ): PromiseToo<ClientCredentials> {
    if (context.request.headers.Authorization)
      return this.getClientCredentialsInAuthorizationHeader(context)
    return this.getClientCredentialsInRequestLocation(context)
  }

  protected async getClient(context: Context): Promise<Maybe<IClient>> {
    return this.getClientByCredentials(
      await this.getClientCredentials(context),
      context,
    )
  }

  protected abstract getClientByCredentials(
    credentials: ClientCredentials,
    context: Context,
  ): PromiseToo<Maybe<IClient>>
}
