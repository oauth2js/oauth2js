import { OAuth2Error, OAuth2ErrorOptions } from '../abstracts/OAuth2Error'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-5.2}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2.1}
 */

export interface InvalidRequestOptions extends OAuth2ErrorOptions {
  location?: RequestLocation
  field?: string
}
export class InvalidRequest extends OAuth2Error {
  public readonly status: number = 400
  public readonly location?: RequestLocation
  public readonly field?: string

  constructor(
    message: string,
    context: Context,
    { field, location, ...options }: InvalidRequestOptions = {},
  ) {
    super(message, context, options)
    if (field) this.field = field
    if (location) this.location = location
  }
}
