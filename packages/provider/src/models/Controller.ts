import { is } from 'type-is'

import { AbstractExchanger } from '../abstracts/AbstractExchanger'
import { AbstractFlow } from '../abstracts/AbstractFlow'
import { AbstractGrant } from '../abstracts/AbstractGrant'
import { AbstractTokenType } from '../abstracts/AbstractTokenType'
import { isOAuth2Error } from '../abstracts/OAuth2Error'
import { InvalidRequest } from '../errors/InvalidRequest'
import { ServerError } from '../errors/ServerError'
import { UnsupportedGrantType } from '../errors/UnsupportedGrantType'
import { GRANT_TYPE_REGEXP, RESPONSE_TYPE_REGEXP } from '../helpers/regexps'
import {
  ArrayInfer,
  ArrayReadOnlyToo,
  ConstructorOf,
  Maybe,
} from '../helpers/types'
import { IMPLEMENTATION_TYPE } from '../interfaces/IControllerImplementation'
import { IRequest } from '../interfaces/IRequest'
import { IResponse } from '../interfaces/IResponse'
import { ITicket } from '../interfaces/ITicket'
import { IUser } from '../interfaces/IUser'
import { TokenBearerType } from '../standards/TokenBearerType'
import { Context } from './Context'

export type Index = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  -1,
]

export type WalkAnd<
  T extends ArrayReadOnlyToo<ConstructorOf<unknown>>,
  K extends string | symbol,
  I extends number = 0,
> = I extends -1
  ? never
  : T[I] extends undefined
  ? never
  : K extends keyof InstanceType<T[I]>
  ? T[Index[I]] extends undefined
    ? InstanceType<T[I]>[K]
    : InstanceType<T[I]>[K] | WalkAnd<T, K, Index[I]>
  : never

export type ImplementationOf<
  G extends
    | ArrayReadOnlyToo<ConstructorOf<AbstractGrant>>
    | ConstructorOf<AbstractGrant>,
> = G extends ArrayReadOnlyToo<ConstructorOf<AbstractGrant>>
  ? Partial<WalkAnd<G, IMPLEMENTATION_TYPE>>
  : G extends ConstructorOf<AbstractGrant>
  ? Partial<WalkAnd<[G], IMPLEMENTATION_TYPE>>
  : never

export class Controller<
  G extends ArrayReadOnlyToo<ConstructorOf<AbstractGrant>> = [],
> {
  private _grants: AbstractGrant[] = []
  private _flows: AbstractFlow[] = []
  private _tokenTypes: AbstractTokenType[] = [new TokenBearerType()]

  public use<T extends ConstructorOf<AbstractGrant>>(
    Grant: T,
  ): Controller<[...G, T]> {
    const grant = new Grant()

    this._grants.push(grant)

    grant['whenBeingAttached'](this as Controller)

    if (grant instanceof AbstractExchanger && 'flow' in grant) {
      const flow = grant['flow']

      this._flows.push(flow)

      flow['whenBeingAttached'](this as Controller)
    }

    return this as unknown as Controller<[...G, T]>
  }

  public implement(implementations: ImplementationOf<G>): this
  public implement<T extends ArrayReadOnlyToo<ArrayInfer<G>>>(
    implementations: ImplementationOf<T>,
    targets: T,
  ): this
  public implement(
    implementations: ImplementationOf<G>,
    targets?: Array<ConstructorOf<AbstractGrant>>,
  ): this {
    if (targets)
      this._grants
        .filter(grant =>
          targets.includes(grant.constructor as ConstructorOf<AbstractGrant>),
        )
        .forEach(instance => Object.assign(instance, implementations))
    else
      this._grants.forEach(instance => Object.assign(instance, implementations))

    return this
  }

  public async token(request: IRequest, response: IResponse): Promise<void> {
    const context = new Context(request, response)

    try {
      if (
        !(
          is(
            context.request.headers['content-type'] as string,
            'application/x-www-form-urlencoded',
          ) ||
          is(
            context.request.headers['Content-Type'] as string,
            'application/x-www-form-urlencoded',
          )
        )
      )
        throw new InvalidRequest(
          "Requests for an access token must be in the form 'application/x-www-form-urlencoded'",
          context,
        )

      const grantType = request.body.grant_type

      if (!grantType)
        throw new InvalidRequest('The grant type is missing', context)

      if (typeof grantType !== 'string')
        throw new InvalidRequest(
          `The grant type must be of type string but is set to ${typeof grantType}`,
          context,
        )

      // TODO: Invalid request or grant?
      if (!GRANT_TYPE_REGEXP.test(grantType))
        throw new InvalidRequest('The grant type is invalid', context)

      const grant = this._grants.find(grant => grant['type'] === grantType)

      if (!grant)
        throw new UnsupportedGrantType(
          'The grant type is not currently supported by the server.',
          context,
        )

      const token = await AbstractGrant.token.call(grant, context)

      const tokenType = this._tokenTypes.find(
        tokenType => tokenType.type === 'bearer',
      )

      if (!tokenType)
        throw new ServerError('No response type implemented on server', context)

      context.response.setHeader('Content-Type', 'application/json')
      context.response.status(200)
      context.response.send(JSON.stringify(tokenType.toJSON(token)))
    } catch (error: unknown) {
      if (isOAuth2Error(error)) {
        context.response.setHeader('Content-Type', 'application/json')
        context.response.status(error.status)
        context.response.send(
          JSON.stringify({
            error: error.error,
            error_description: error.description,
          }),
        )
      } else throw error
    }
  }

  public async release(request: IRequest, response: IResponse): Promise<void> {
    const context = new Context(request, response)
    const responseType =
      request.body.response_type ?? request.query.response_type

    if (!responseType)
      throw new InvalidRequest('The response type is missing', context)

    if (typeof responseType !== 'string')
      throw new InvalidRequest(
        `The response type must be of type string but is set to ${typeof responseType}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!RESPONSE_TYPE_REGEXP.test(responseType))
      throw new InvalidRequest('The response type is invalid', context)

    const flow = this._flows.find(flow => flow['type'] === responseType)

    if (!flow)
      throw new UnsupportedGrantType(
        'The response type is not currently supported by the server.',
        context,
      )

    await AbstractFlow.release.call(flow, context).catch(async error => {
      if (!isOAuth2Error(error)) throw error
      await AbstractFlow.releaseError.call(flow, error, context)
    })
  }

  public async authorize(
    exchanger: ConstructorOf<AbstractExchanger>,
    ticket: ITicket,
    user: IUser,
    request: IRequest,
    response: IResponse,
  ) {
    const context = new Context(request, response)

    const grant = this._grants.find(
      grant => grant instanceof exchanger,
    ) as Maybe<AbstractExchanger>

    if (!grant)
      throw new ServerError(
        `No instance of ${exchanger.name} grant found`,
        context,
      )

    const flow = grant['flow'] as Maybe<AbstractFlow>

    if (!flow)
      throw new ServerError(
        `The ${exchanger.name} grant has no ticket flow.`,
        context,
      )

    await AbstractFlow.authorize
      .call(flow, ticket, user, context)
      .catch(async error => {
        if (!isOAuth2Error(error)) throw error
        await AbstractFlow.authorizeError.call(
          flow,
          error,
          ticket,
          user,
          context,
        )
      })
  }

  public async deny(
    exchanger: ConstructorOf<AbstractExchanger>,
    ticket: ITicket,
    request: IRequest,
    response: IResponse,
  ) {
    const context = new Context(request, response)
    const grant = this._grants.find(
      grant => grant instanceof exchanger,
    ) as Maybe<AbstractExchanger>

    if (!grant)
      throw new ServerError(
        `No instance of ${exchanger.name} grant found`,
        context,
      )

    const flow = grant['flow'] as Maybe<AbstractFlow>

    if (!flow)
      throw new ServerError(
        `The ${exchanger.name} grant has no ticket flow.`,
        context,
      )

    await AbstractFlow.deny.call(flow, ticket, context).catch(async error => {
      if (!isOAuth2Error(error)) throw error
      await AbstractFlow.denyError.call(flow, error, ticket, context)
    })
  }
}
