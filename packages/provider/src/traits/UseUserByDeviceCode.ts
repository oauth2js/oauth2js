import { PromiseToo, Maybe } from '../helpers/types'
import { IDeviceCode } from '../interfaces/IDeviceCode'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import { UseUser } from './UseUser'

export abstract class UseUserByDeviceCode extends UseUser {
  protected async getUser(context: Context): Promise<Maybe<IUser>> {
    return this.getUserByDeviceCode(await this.getDeviceCode(context), context)
  }

  protected abstract getUserByDeviceCode(
    deviceCode: IDeviceCode,
    context: Context,
  ): PromiseToo<Maybe<IUser>>

  protected abstract getDeviceCode(context: Context): PromiseToo<IDeviceCode>
}
