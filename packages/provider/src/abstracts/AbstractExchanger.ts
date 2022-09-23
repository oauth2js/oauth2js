import { InvalidGrant } from '../errors/InvalidGrant'
import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { ITicket } from '../interfaces/ITicket'
import { IToken } from '../interfaces/IToken'
import { Context } from '../models/Context'
import { AbstractFlow } from './AbstractFlow'
import { AbstractGrant } from './AbstractGrant'

const TICKET_PROPERTY = Symbol.for('oauth2js:server:context:ticket-property')

export abstract class AbstractExchanger extends AbstractGrant {
  protected abstract readonly flow: AbstractFlow

  protected async getOrLoadTicket(context: Context) {
    if (!context.locals[TICKET_PROPERTY])
      this.assertTicket(
        (context.locals[TICKET_PROPERTY] = await this.getTicket(context)),
        context,
      )

    return context.locals[TICKET_PROPERTY] as ITicket
  }

  protected assertTicket(
    ticket: Maybe<ITicket>,
    context: Context,
  ): asserts ticket is ITicket {
    if (!ticket) throw new InvalidGrant('Invalid exchange ticket', context)

    if (typeof ticket !== 'object')
      throw new ServerError(
        `The exchange ticket must be an object but it was defined as a ${typeof ticket}`,
        context,
      )
  }

  protected async createToken(context: Context): Promise<IToken> {
    const ticket = await this.getOrLoadTicket(context)

    return this.exchangeTicketByToken(ticket, context)
  }

  protected async saveToken(token: IToken, context: Context): Promise<IToken> {
    const ticket = await this.getOrLoadTicket(context)

    if (!(await this.revokeTicket(ticket, context)))
      throw new InvalidGrant('Invalid exchange ticket', context)

    return this.saveExchangeToken(token, ticket, context)
  }

  protected abstract getTicket(context: Context): PromiseToo<Maybe<ITicket>>

  protected abstract exchangeTicketByToken(
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>

  protected abstract saveExchangeToken(
    token: IToken,
    ticket: ITicket,
    context: Context,
  ): PromiseToo<IToken>

  protected abstract revokeTicket(
    ticket: ITicket,
    context: Context,
  ): PromiseToo<boolean>
}
