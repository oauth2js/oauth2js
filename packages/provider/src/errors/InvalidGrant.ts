import { OAuth2Error } from '../abstracts/OAuth2Error'

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-5.2}
 */
export class InvalidGrant extends OAuth2Error {
  public readonly status: number = 400
}
