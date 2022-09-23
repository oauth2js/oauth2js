import { InvalidGrant } from '../errors/InvalidGrant'
import { Maybe, PromiseToo } from '../helpers/types'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'

const USER_PROPERTY = Symbol.for('oauth2js:server:context:user-property')

export abstract class UseUser {
  protected async loadUser(context: Context): Promise<IUser> {
    if (!context.locals[USER_PROPERTY])
      this.assertUser(
        (context.locals[USER_PROPERTY] = await this.getUser(context)),
        context,
      )
    return context.locals[USER_PROPERTY] as IUser
  }

  protected getOrLoadUser(context: Context): PromiseToo<IUser> {
    if (context.locals[USER_PROPERTY])
      return context.locals[USER_PROPERTY] as IUser
    return this.loadUser(context)
  }

  protected assertUser(
    user: Maybe<IUser>,
    context: Context,
  ): asserts user is IUser {
    if (!user) throw new InvalidGrant('The user is invalid', context)
  }

  protected abstract getUser(context: Context): PromiseToo<Maybe<IUser>>
}
