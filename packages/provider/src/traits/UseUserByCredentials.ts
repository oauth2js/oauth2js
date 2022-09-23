import { InvalidRequest } from '../errors/InvalidRequest'
import { ServerError } from '../errors/ServerError'
import { PASSWORD_REGEXP, USERNAME_REGEXP } from '../helpers/regexps'
import { PromiseToo, Maybe } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { IUser } from '../interfaces/IUser'
import { Context } from '../models/Context'
import { UseUser } from './UseUser'

export interface UserCredentials {
  username: string
  password: string
}

export abstract class UseUserByCredentials extends UseUser {
  protected abstract readonly userCredentialsLocation: RequestLocation

  protected getUserCredentials(context: Context): PromiseToo<UserCredentials> {
    const location = this.userCredentialsLocation

    if (!(location in context.request))
      throw new ServerError('Location not included in the request', context)

    const username = context.request[location].username

    if (!username) throw new InvalidRequest('The username is missing', context)

    if (typeof username !== 'string')
      throw new InvalidRequest(
        `The username must be of type string but is defined as ${typeof username}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!USERNAME_REGEXP.test(username))
      throw new InvalidRequest('The username is invalid', context)

    const password = context.request[location].password

    if (!password) throw new InvalidRequest('The password is missing', context)

    if (typeof password !== 'string')
      throw new InvalidRequest(
        `The password must be of type string but is defined as ${typeof password}`,
        context,
      )

    if (!PASSWORD_REGEXP.test(password))
      throw new InvalidRequest('The password is invalid', context)

    return { username, password }
  }

  protected async getUser(context: Context): Promise<Maybe<IUser>> {
    return this.getUserByCredentials(
      await this.getUserCredentials(context),
      context,
    )
  }

  protected abstract getUserByCredentials(
    credentials: UserCredentials,
    context: Context,
  ): PromiseToo<Maybe<IUser>>
}
