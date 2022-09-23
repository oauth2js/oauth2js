/* eslint-disable @typescript-eslint/no-misused-promises */
import { AbstractExchanger } from '@oauth2js/provider'
import { ConstructorOf, PromiseToo } from '@oauth2js/provider/src/helpers/types'
import { Handler, Request } from 'express'

import { TicketTypeFromAbstractExchanger } from '../helpers/types'

export interface DenyConfig<T extends AbstractExchanger> {
  getTicket(request: Request): PromiseToo<TicketTypeFromAbstractExchanger<T>>
}

export default function deny<T extends AbstractExchanger>(
  exchanger: ConstructorOf<T>,
  config: DenyConfig<T>,
): Handler {
  return async (req, res) => {
    const { getTicket } = config
    const [ticket] = await Promise.all([getTicket(req)])

    await req[' $oauth2js'].controller.deny(exchanger, ticket, req, res)
  }
}
