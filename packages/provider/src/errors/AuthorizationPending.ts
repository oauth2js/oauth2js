import { OAuth2Error } from '../abstracts/OAuth2Error'

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8628#section-3.5}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8628#section-7.3}
 */
export class AuthorizationPending extends OAuth2Error {
  public readonly status: number = 400
}
