import { InvalidRequest } from '../errors/InvalidRequest'
import { CLIENT_ID_REGEXP } from '../helpers/regexps'
import { PromiseToo } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'

export abstract class UseClientId {
  protected abstract readonly clientIdLocation: RequestLocation

  protected getClientId(context: Context): PromiseToo<string> {
    const clientId = context.request[this.clientIdLocation].client_id

    if (!clientId) throw new InvalidRequest('The client id is missing', context)

    if (typeof clientId !== 'string')
      throw new InvalidRequest(
        `The client id must be of type string but is defined as ${typeof clientId}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!CLIENT_ID_REGEXP.test(clientId))
      throw new InvalidRequest('The client id is invalid', context)

    return clientId
  }
}
