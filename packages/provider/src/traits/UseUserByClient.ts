import { Maybe, PromiseToo } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import { UseUser } from './UseUser'

export abstract class UseUserByClient extends UseUser {
  protected async getUser(context: Context): Promise<Maybe<IUser>> {
    return this.getUserByClient(await this.getOrLoadClient(context), context)
  }

  protected abstract getUserByClient(
    client: IClient,
    context: Context,
  ): PromiseToo<Maybe<IUser>>

  protected abstract getOrLoadClient(context: Context): PromiseToo<IClient>
}
