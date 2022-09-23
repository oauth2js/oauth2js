import { ServerError } from '../errors/ServerError'
import { Maybe, PromiseToo } from '../helpers/types'
import { IToken } from '../interfaces/IToken'
import { Context } from '../models/Context'
import { ExposeControllerConnection } from '../models/ExposeControllerConnection'
import { generateRandomToken } from '../tools/generateRandomToken'
import { snakelize } from '../tools/snakelize'

const rule = /(^Abstract|^OAuth2|^OAuth2Abstract|^AbstractOAuth2|Grant$)/g

export abstract class AbstractGrant extends ExposeControllerConnection {
  protected readonly type = snakelize(this.constructor.name.replace(rule, ''))

  protected abstract readonly accessTokenLifetime: number
  protected abstract readonly refreshTokenLifetime: number | null

  public static async token(this: AbstractGrant, context: Context) {
    const token = await this.createToken(context)

    this.assertToken(token, context)
    return await this.saveToken(token, context)
  }

  protected assertToken(
    token: Maybe<IToken>,
    context: Context,
  ): asserts token is IToken {
    if (!token) throw new ServerError('Token needs to be set', context)

    if (typeof token !== 'object')
      throw new ServerError(
        `The token must be an object but it was defined as a ${typeof token}`,
        context,
      )

    if (typeof token.accessToken !== 'string')
      throw new ServerError(
        `The token must contain a string-type 'accessToken' property but it was defined as a ${typeof token.accessToken}`,
        context,
      )

    if (
      typeof token.accessTokenExpiresAt !== 'object' ||
      !(token.accessTokenExpiresAt instanceof Date)
    )
      throw new ServerError(
        `The token must contain a 'accessTokenExpiresAt' property instance of type Date but it was defined as a ${
          typeof token.accessTokenExpiresAt === 'object'
            ? (token.accessTokenExpiresAt as object).constructor.name
            : typeof token.accessTokenExpiresAt
        }`,
        context,
      )

    if (
      (token.refreshToken || token.refreshTokenExpiresAt) &&
      typeof token.refreshToken !== 'string'
    )
      throw new ServerError(
        `The token must contain a string-type 'refreshToken' property but it was defined as a ${typeof token.accessToken}`,
        context,
      )

    if (
      (token.refreshToken || token.refreshTokenExpiresAt) &&
      (typeof token.refreshTokenExpiresAt !== 'object' ||
        !(token.refreshTokenExpiresAt instanceof Date))
    )
      throw new ServerError(
        `The token must contain a 'refreshTokenExpiresAt' property instance of type Date but it was defined as a ${
          typeof token.accessTokenExpiresAt === 'object'
            ? (token.accessTokenExpiresAt as object).constructor.name
            : typeof token.accessTokenExpiresAt
        }`,
        context,
      )

    if (typeof token.client !== 'object')
      throw new ServerError(
        `The token must contain a object-type 'client' property but it was defined as a ${typeof token.client}`,
        context,
      )

    if (typeof token.user !== 'object')
      throw new ServerError(
        `The token must contain a object-type 'user' property but it was defined as a ${typeof token.user}`,
        context,
      )

    if (!Array.isArray(token.scopes))
      throw new ServerError(
        `The token must contain a 'scopes' property instance of type Array, but it has been defined as a ${typeof token.user}`,
        context,
      )

    if (!token.scopes.every(scope => typeof scope === 'object'))
      throw new ServerError(
        'All scoped items in the token must be of type object.',
        context,
      )
  }

  protected generateAccessToken(context: Context): PromiseToo<string>
  protected generateAccessToken(): PromiseToo<string> {
    return generateRandomToken()
  }

  protected generateRefreshToken(context: Context): PromiseToo<string> {
    if (this.refreshTokenLifetime === null)
      throw new ServerError(
        'It is not possible to generate a refresh token when its lifetime is not set.',
        context,
      )
    return generateRandomToken()
  }

  protected getAccessTokenExpiresAt(context: Context): PromiseToo<Date>
  protected getAccessTokenExpiresAt(): PromiseToo<Date> {
    return new Date(Date.now() + this.accessTokenLifetime)
  }

  protected getRefreshTokenExpiresAt(context: Context): PromiseToo<Date> {
    if (this.refreshTokenLifetime === null)
      throw new ServerError(
        'It is not possible to get the expiration time of a refresh token when its lifetime is not set.',
        context,
      )
    return new Date(Date.now() + this.refreshTokenLifetime)
  }

  protected abstract createToken(context: Context): PromiseToo<IToken>

  protected abstract saveToken(
    token: IToken,
    context: Context,
  ): PromiseToo<IToken>
}
