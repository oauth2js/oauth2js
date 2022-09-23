import { OAuth2Error } from '@oauth2js/provider'

export class InvalidToken extends OAuth2Error {
  public status = 401
}
