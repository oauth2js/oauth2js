import { Context } from '../models/Context'
import { snakelize } from '../tools/snakelize'

export interface OAuth2ErrorOptions extends ErrorOptions {
  secure?: boolean
}

const rule = /^(OAuth2)?([A-z]+)$/

export abstract class OAuth2Error {
  public readonly error: string = snakelize(
    this.constructor.name.replace(rule, '$2'),
  )

  public readonly cause?: Error

  public readonly stack!: string

  public readonly secure: boolean = false

  public readonly description: string

  public abstract readonly status: number

  constructor(
    public message: string,
    public context: Context,
    { cause, secure = false }: OAuth2ErrorOptions = {},
  ) {
    Error.call(this, message)

    this.description = message

    Error.captureStackTrace(this, this.constructor)

    if (cause) this.cause = cause as Error

    this.secure = secure
  }
}

export interface OAuth2Error extends Error {}

export function isOAuth2Error(error: unknown): error is OAuth2Error {
  return typeof error === 'object' && error instanceof OAuth2Error
}

try {
  OAuth2Error.prototype = Object.create(Error.prototype)
  OAuth2Error.prototype.constructor = OAuth2Error
} catch {
  // Empty
}
