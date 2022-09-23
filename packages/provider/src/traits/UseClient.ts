import { InvalidClient } from '../errors/InvalidClient'
import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { Context } from '../models/Context'

const CLIENT_PROPERTY = Symbol.for('oauth2js:server:context:client-property')

export abstract class UseClient {
  protected getClientSync(context: Context): IClient {
    if (!context.locals[CLIENT_PROPERTY])
      throw new ServerError(
        'The client is not set to be accessed synchronously',
        context,
      )
    return context.locals[CLIENT_PROPERTY] as IClient
  }

  protected async getOrLoadClient(context: Context) {
    if (!context.locals[CLIENT_PROPERTY]) return this.loadClient(context)
    return context.locals[CLIENT_PROPERTY] as IClient
  }

  protected async loadClient(context: Context): Promise<IClient> {
    this.assertClient(
      (context.locals[CLIENT_PROPERTY] = await this.getClient(context)),
      context,
    )
    return context.locals[CLIENT_PROPERTY]
  }

  protected assertClient(
    client: Maybe<IClient>,
    context: Context,
  ): asserts client is IClient {
    if (!client) throw new InvalidClient('The client is invalid', context)

    if (typeof client !== 'object')
      throw new ServerError(
        `The client must be of type object but is defined as ${typeof client}`,
        context,
      )
  }

  protected abstract getClient(context: Context): PromiseToo<Maybe<IClient>>
}
