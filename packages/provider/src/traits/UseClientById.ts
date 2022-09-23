import { Mixed } from '@prunus/mixin'

import { PromiseToo, Maybe } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'
import { UseClient } from './UseClient'
import { UseClientId } from './UseClientId'

export abstract class UseClientById extends Mixed(UseClient, UseClientId) {
  protected abstract override readonly clientIdLocation: RequestLocation

  protected async getClient(context: Context): Promise<Maybe<IClient>> {
    return this.getClientById(await this.getClientId(context), context)
  }

  protected abstract getClientById(
    clientId: string,
    context: Context,
  ): PromiseToo<Maybe<IClient>>
}
