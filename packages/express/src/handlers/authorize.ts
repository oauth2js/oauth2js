/* eslint-disable @typescript-eslint/no-misused-promises */
import { AbstractExchanger, IUser } from '@oauth2js/provider'
import { ConstructorOf, PromiseToo } from '@oauth2js/provider/src/helpers/types'
import { Handler, Request } from 'express'

import { TicketTypeFromAbstractExchanger } from '../helpers/types'

export interface AuthorizeConfig<T extends AbstractExchanger> {
  getTicket(request: Request): PromiseToo<TicketTypeFromAbstractExchanger<T>>
  getUser(request: Request): PromiseToo<IUser>
}

export default function authorize<T extends AbstractExchanger>(
  exchanger: ConstructorOf<T>,
  config: AuthorizeConfig<T>,
): Handler {
  return async (req, res) => {
    const { getTicket, getUser } = config
    const [ticket, user] = await Promise.all([getTicket(req), getUser(req)])

    await req[' $oauth2js'].controller.authorize(
      exchanger,
      ticket,
      user,
      req,
      res,
    )
  }
}
