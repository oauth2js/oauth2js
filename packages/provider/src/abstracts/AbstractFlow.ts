import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { ITicket } from '../interfaces/ITicket'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import { ExposeControllerConnection } from '../models/ExposeControllerConnection'
import { snakelize } from '../tools/snakelize'
import { OAuth2Error } from './OAuth2Error'

const rule = /(^Abstract|^OAuth2|^OAuth2Abstract|^AbstractOAuth2|Flow$)/g

export abstract class AbstractFlow extends ExposeControllerConnection {
  protected readonly type = snakelize(this.constructor.name.replace(rule, ''))

  public static async release(this: AbstractFlow, context: Context) {
    const ticket = await this.createTicket(context)

    this.assertTicket(ticket, context)
    await this.release(ticket, context)
  }

  public static async authorize(
    this: AbstractFlow,
    ticket: ITicket,
    user: IUser,
    context: Context,
  ) {
    await this.authorize(ticket, user, context)
  }

  public static async deny(
    this: AbstractFlow,
    ticket: ITicket,
    context: Context,
  ) {
    await this.deny(ticket, context)
  }

  public static async releaseError(
    this: AbstractFlow,
    error: OAuth2Error,
    context: Context,
  ) {
    await this.releaseError(error, context)
  }

  public static async authorizeError(
    this: AbstractFlow,
    error: OAuth2Error,
    ticket: ITicket,
    user: IUser,
    context: Context,
  ) {
    await this.authorizeError(error, ticket, user, context)
  }

  public static async denyError(
    this: AbstractFlow,
    error: OAuth2Error,
    ticket: ITicket,
    context: Context,
  ) {
    await this.denyError(error, ticket, context)
  }

  protected assertTicket(ticket: Maybe<ITicket>, context: Context) {
    if (!ticket)
      throw new ServerError('Exchange ticket needs to be set', context)

    if (typeof ticket !== 'object')
      throw new ServerError(
        `The exchange ticket must be an object but it was defined as a ${typeof ticket}`,
        context,
      )
  }

  protected abstract createTicket(context: Context): PromiseToo<ITicket>
  protected abstract release(
    ticket: ITicket,
    context: Context,
  ): PromiseToo<void>
  protected abstract authorize(
    ticket: ITicket,
    user: IUser,
    context: Context,
  ): PromiseToo<void>
  protected abstract deny(ticket: ITicket, context: Context): PromiseToo<void>

  protected abstract releaseError(
    error: OAuth2Error,
    context: Context,
  ): PromiseToo<void>
  protected abstract authorizeError(
    error: OAuth2Error,
    ticket: ITicket,
    user: IUser,
    context: Context,
  ): PromiseToo<void>
  protected abstract denyError(
    error: OAuth2Error,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<void>
}
