/* eslint-disable max-lines-per-function */
import { AbstractExchanger } from '../abstracts/AbstractExchanger'
import { AbstractFlow } from '../abstracts/AbstractFlow'
import { AbstractAuthorizationCodeGrant } from '../abstracts/standards/AbstractAuthorizationCodeGrant'
import { InvalidClient } from '../errors/InvalidClient'
import { InvalidGrant } from '../errors/InvalidGrant'
import { InvalidRequest } from '../errors/InvalidRequest'
import { ServerError } from '../errors/ServerError'
import {
  AbstractConstructorOf,
  ConstructorOf,
  Maybe,
  PromiseToo,
} from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { IncrementControllerImplementation } from '../interfaces/IControllerImplementation'
import { RequestLocation } from '../interfaces/IRequest'
import { ITicket } from '../interfaces/ITicket'
import { IToken } from '../interfaces/IToken'
import { Context } from '../models/Context'
import { Controller } from '../models/Controller'
import { snakelize } from '../tools/snakelize'
import { UseClient } from '../traits/UseClient'
import { UseClientByCredentials } from '../traits/UseClientByCredentials'
import { UseClientById } from '../traits/UseClientById'
import {
  UseClientConstructor,
  UseClientPolymorphClass,
} from '../traits/UseClientPolymorph'

declare class ImplementedExchanger extends UseClient {
  protected flow: AbstractFlow &
    UseClientPolymorphClass<UseClientConstructor[]> &
    UseClientById
  protected accessTokenLifetime: number
  protected refreshTokenLifetime: number | null

  protected selectUseClientProvider(
    context: Context,
  ): AbstractConstructorOf<UseClientById>

  protected getClient(context: Context): PromiseToo<Maybe<IClient>>

  protected getTicket(context: Context): PromiseToo<Maybe<ITicket>>
  protected exchangeTicketByToken(
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>
  protected saveExchangeToken(
    token: IToken,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>
  protected revokeTicket(ticket: ITicket, context: Context): PromiseToo<boolean>
}

interface ImplementedExchanger
  extends AbstractExchanger,
    UseClientPolymorphClass<[AbstractConstructorOf<UseClientById>]>,
    AbstractConstructorOf<UseClient> {}

export interface ProofKeyForCodeExchangeTicket extends ITicket {
  codeChallenge: string
  codeChallengeMethod: string
}

export type ProofKeyForCodeExchangeAlgorithm =
  | ((text: string) => string)
  | {
      hash(text: string): string
      compare(hash: string, text: string): boolean
    }

export interface ProofKeyForCodeExchangeOptions {
  challengeLocation?: RequestLocation
  algorithms?: Record<
    string,
    (verifier: string, challenge: string) => boolean | Promise<boolean>
  >
  defaultAlgorithm?: string
}

function getDefaultChallengeLocation(
  exchanger: ConstructorOf<AbstractExchanger>,
) {
  if (exchanger.prototype instanceof AbstractAuthorizationCodeGrant)
    return RequestLocation.Query
  return RequestLocation.Body
}

const defaultAlgorithms: Record<
  string,
  (verifier: string, challenge: string) => boolean | Promise<boolean>
> = {
  S256: async (verifier, challenge) =>
    import('crypto').then(crypto => {
      return (
        crypto.createHash('sha256').update(verifier).digest('base64url') ===
        challenge
      )
    }),
  plain: (verifier, challenge) => verifier === challenge,
}

const rule = /(^Abstract|^OAuth2|^OAuth2Abstract|^AbstractOAuth2|Grant$)/g

interface ProofKeyForCodeExchangeControllerImplementation {
  isPublicClient(client: IClient, context: Context): PromiseToo<boolean>
  compareNonPublicClientSecret(
    client: IClient,
    secret: string,
    context: Context,
  ): PromiseToo<boolean>
}

type ProofKeyForCodeExchangeConstructor<I extends AbstractExchanger> =
  ConstructorOf<
    I &
      IncrementControllerImplementation<
        I,
        ProofKeyForCodeExchangeControllerImplementation
      >
  >

export function ProofKeyForCodeExchange<I extends AbstractExchanger>(
  exchangerConstructor: ConstructorOf<I>,
  options?: ProofKeyForCodeExchangeOptions,
): ProofKeyForCodeExchangeConstructor<I> {
  const {
    challengeLocation = getDefaultChallengeLocation(exchangerConstructor),
    algorithms = defaultAlgorithms,
    defaultAlgorithm = Object.keys(algorithms)[0],
  }: ProofKeyForCodeExchangeOptions = options ?? {}

  const hasAlgorithms = Object.keys(algorithms).length

  if (!hasAlgorithms) throw new Error('No algorithms are defined')

  const ExchangerClass =
    exchangerConstructor as unknown as ConstructorOf<ImplementedExchanger>

  return class ProofKeyForCodeExchange extends ExchangerClass {
    constructor() {
      super()

      if (this.type === snakelize('ProofKeyForCodeExchange'))
        // @ts-expect-error: If the grant automatically generates the type, the extension needs to preserve the previous type of the new grant class generated.
        this.type = snakelize(exchangerConstructor.name.replace(rule, ''))
    }

    protected override whenBeingAttached(
      controller: Controller,
    ): PromiseToo<void> {
      super.whenBeingAttached(controller)

      const createTicket = this.flow['createTicket']

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const that = this

      if (!(this.flow instanceof UseClient))
        throw new Error(
          'The flow inside the grant should be a UseClient instance',
        )

      if (!(this.flow instanceof UseClientPolymorphClass))
        throw new Error(
          'The flow inside the grant should be a UseClientPolymorph instance',
        )

      if (!(this.flow instanceof UseClientById))
        throw new Error(
          'The flow inside the grant should be a UseClientById instance',
        )

      if (!(this.flow instanceof UseClientByCredentials))
        throw new Error(
          'The flow inside the grant should be a UseClientByCredentials instance',
        )

      this.flow['createTicket'] = async function (
        this: AbstractFlow & UseClient,
        context,
      ) {
        const client = await this['getOrLoadClient'](context)

        if (!(await that.isPublicClient(client, context))) {
          if (!context.request[challengeLocation].client_secret)
            throw new InvalidRequest('The client secret is missing', context)

          if (
            typeof context.request[challengeLocation].client_secret !== 'string'
          )
            throw new InvalidRequest(
              `The client secret must be of type string but is defined as ${typeof context
                .request[challengeLocation].client_secret}`,
              context,
            )

          if (
            !(await that.compareNonPublicClientSecret(
              client,
              context.request[challengeLocation].client_secret as string,
              context,
            ))
          )
            throw new InvalidClient('The client is invalid', context)

          return createTicket.call(this, context)
        }

        const codeChallenge = context.request[challengeLocation].code_challenge

        if (!codeChallenge)
          throw new InvalidRequest('The code challenge is missing', context)

        if (typeof codeChallenge !== 'string')
          throw new InvalidRequest(
            `The code challenge must be of type string but is defined as ${typeof codeChallenge}`,
            context,
          )

        const codeChallengeMethod =
          context.request[challengeLocation].code_challenge_method ??
          defaultAlgorithm

        if (!codeChallengeMethod)
          throw new InvalidRequest(
            'The code challenge method is missing',
            context,
          )

        if (typeof codeChallengeMethod !== 'string')
          throw new InvalidRequest(
            `The code challenge method must be of type string but is defined as ${typeof codeChallengeMethod}`,
            context,
          )

        if (!(codeChallengeMethod in algorithms))
          throw new InvalidRequest(
            'The code challenge method is invalid',
            context,
          )

        const ticket = await createTicket.call(this, context)

        return Object.assign(ticket, { codeChallenge, codeChallengeMethod })
      }

      this.flow['selectUseClientProvider'] = () => UseClientById
    }

    protected override async exchangeTicketByToken(
      ticket: ProofKeyForCodeExchangeTicket,
      context: Context,
    ): Promise<IToken> {
      if (!(await this.isPublicClient(ticket.client, context)))
        return super.exchangeTicketByToken(ticket, context)

      const codeVerifier = context.request.body.code_verifier

      if (!codeVerifier)
        throw new InvalidRequest('The code verifier is missing', context)

      if (typeof codeVerifier !== 'string')
        throw new InvalidRequest(
          `The code verifier must be of type string but is defined as ${typeof codeVerifier}`,
          context,
        )

      if (!(ticket.codeChallengeMethod in algorithms))
        throw new ServerError(
          `The code challenge method inside ticket is not include in algorithms expected one of: ${Object.keys(
            algorithms,
          ).join(' ,')} but receive ${ticket.codeChallengeMethod}`,
          context,
        )

      if (
        !algorithms[ticket.codeChallengeMethod](
          codeVerifier,
          ticket.codeChallenge,
        )
      )
        throw new InvalidGrant('Lost in code challenge', context)

      return super.exchangeTicketByToken(ticket, context)
    }

    protected isPublicClient(
      client: IClient,
      context: Context,
    ): PromiseToo<boolean>
    protected isPublicClient(): PromiseToo<boolean> {
      return true
    }

    protected compareNonPublicClientSecret(
      client: IClient,
      secret: string,
      context: Context,
    ): PromiseToo<boolean> {
      throw new ServerError(
        'The `compareNonPublicClientSecret` definition is missing from the implementation.',
        context,
      )
    }
  } as unknown as ProofKeyForCodeExchangeConstructor<I>
}
