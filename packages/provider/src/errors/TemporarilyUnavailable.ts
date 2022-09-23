import { OAuth2Error } from '../abstracts/OAuth2Error'

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2.1}
 */
export class TemporarilyUnavailable extends OAuth2Error {
  public readonly status: number = 401
}
