import { AbstractExchanger } from '@oauth2js/provider'
import { PromiseToo } from '@oauth2js/provider/src/helpers/types'

export type TicketTypeFromAbstractExchanger<T extends AbstractExchanger> =
  // @ts-expect-error: TODO
  ReturnType<T['flow']['createTicket']> extends PromiseToo<infer TTicket>
    ? TTicket
    : never
