import { InvalidRequest } from '../errors/InvalidRequest'
import { URI_REGEXP } from '../helpers/regexps'
import { Maybe, PromiseToo } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { Context } from '../models/Context'

export const REDIRECT_URI_PROPERTY = Symbol.for(
  'oauth2js:server:context:redirect-uri-property',
)

export abstract class UseRedirectUri {
  protected abstract redirectUriLocation: RequestLocation

  protected getRedirectUri(context: Context): PromiseToo<Maybe<string>> {
    return context.request[this.redirectUriLocation]
      .redirect_uri as Maybe<string>
  }

  protected async loadRedirectUri(context: Context): Promise<string> {
    const redirectUri = await this.getRedirectUri(context)

    this.assertRedirectUri(redirectUri, context)

    context.locals[REDIRECT_URI_PROPERTY] = redirectUri

    return redirectUri
  }

  protected getOrLoadRedirectUri(context: Context): PromiseToo<string> {
    if (!context.locals[REDIRECT_URI_PROPERTY])
      return this.loadRedirectUri(context)
    return context.locals[REDIRECT_URI_PROPERTY] as string
  }

  protected assertRedirectUri(
    redirectUri: Maybe<string>,
    context: Context,
  ): asserts redirectUri is string {
    if (!redirectUri)
      throw new InvalidRequest('The redirect uri is invalid', context)

    if (typeof redirectUri !== 'string')
      throw new InvalidRequest(
        `The redirect uri must be of type string but is defined as ${typeof redirectUri}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!URI_REGEXP.test(redirectUri))
      throw new InvalidRequest('The redirect uri is invalid', context)
  }
}
