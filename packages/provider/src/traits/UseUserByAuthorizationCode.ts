import { PromiseToo, Maybe } from '../helpers/types'
import { IAuthorizationCode } from '../interfaces/IAuthorizationCode'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import { UseUser } from './UseUser'

export abstract class UseUserByAuthorizationCode extends UseUser {
  protected async getUser(context: Context): Promise<Maybe<IUser>> {
    return this.getUserByAuthorizationCode(
      await this.getAuthorizationCode(context),
      context,
    )
  }

  protected abstract getUserByAuthorizationCode(
    authorizationCode: IAuthorizationCode,
    context: Context,
  ): PromiseToo<Maybe<IUser>>

  protected abstract getAuthorizationCode(
    context: Context,
  ): PromiseToo<IAuthorizationCode>
}
