import { OAuth2Error } from '../abstracts/OAuth2Error'

/**
 * `AccessDenied` reference when user denies the request to access their information.
 *
 * It is used by the default definition of the [The OAuth 2.0 Authorization Framework]({@link https://datatracker.ietf.org/doc/html/rfc6749}).
 * In the error answer [section]({@link https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2.1}).
 *
 * Also used in [OAuth 2.0 Device Authorization Grant]({@link https://datatracker.ietf.org/doc/html/rfc8628}) authorization token creation.
 * In the error answer [section]({@link https://datatracker.ietf.org/doc/html/rfc8628#section-3.5}).
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2.1}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8628}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8628#section-3.5}
 */
export class AccessDenied extends OAuth2Error {
  public readonly status: number = 401
}
