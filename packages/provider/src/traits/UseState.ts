import { InvalidRequest } from '../errors/InvalidRequest'
import { STATE_REGEXP } from '../helpers/regexps'
import { PromiseToo } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'

export const STATE_PROPERTY = Symbol.for(
  'oauth2js:server:context:redirect-uri-property',
)

export abstract class UseState {
  protected abstract readonly stateLocation: RequestLocation
  protected abstract readonly allowEmptyState: boolean

  protected getState(context: Context): PromiseToo<string | null> {
    const state = context.request[this.stateLocation].state

    if (!state && this.allowEmptyState) return null

    if (typeof state !== 'string')
      throw new InvalidRequest('The state is missing', context)

    // TODO: Invalid request or grant?
    if (!STATE_REGEXP.test(state))
      throw new InvalidRequest('The state is invalid', context)

    return state
  }
}
