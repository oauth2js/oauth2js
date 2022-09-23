import { InvalidRequest } from '../errors/InvalidRequest'
import { ServerError } from '../errors/ServerError'
import { SCOPE_REGEXP } from '../helpers/regexps'
import { Maybe, PromiseToo } from '../helpers/types'
import { RequestLocation } from '../interfaces/IRequest'
import { IScope } from '../interfaces/IScope'
import { Context } from '../models/Context'

const SCOPES_PROPERTY = Symbol.for('oauth2js:server:context:scopes-property')

const SCOPES_OBJECTS_PROPERTY = Symbol.for(
  'oauth2js:server:context:scopes-objects-property',
)

const rule = /[^,+ "']+|"([^"]*)"|'([^']*)'/g

export abstract class UseScopes {
  protected abstract readonly scopeLocation: RequestLocation

  protected getScopes(context: Context): PromiseToo<string[]> {
    const scope = context.request[this.scopeLocation].scope as Maybe<string>

    if (!scope) throw new InvalidRequest('The scope is missing', context)

    if (typeof scope !== 'string')
      throw new InvalidRequest(
        `The scope must be of type string but is defined as ${typeof scope}`,
        context,
      )

    // TODO: Invalid request or grant?
    if (!SCOPE_REGEXP.test(scope))
      throw new InvalidRequest('The scope is invalid', context)

    return Array.from(scope.matchAll(rule))
      .map(([str, match]) => (match ? match : str))
      .filter(Boolean)
  }

  protected getOrLoadScopes(context: Context): PromiseToo<string[]> {
    if (!context.locals[SCOPES_PROPERTY]) return this.loadScopes(context)
    return context.locals[SCOPES_PROPERTY] as string[]
  }

  protected getOrLoadScopesObjects(context: Context): PromiseToo<IScope[]> {
    if (!context.locals[SCOPES_OBJECTS_PROPERTY])
      return this.loadScopesObjects(context)
    return context.locals[SCOPES_OBJECTS_PROPERTY] as IScope[]
  }

  protected async loadScopes(context: Context): Promise<string[]> {
    this.assertScopes(
      (context.locals[SCOPES_PROPERTY] = await this.getScopes(context)),
      context,
    )
    return context.locals[SCOPES_PROPERTY] as string[]
  }

  protected async loadScopesObjects(context: Context): Promise<IScope[]> {
    this.assertScopesObjects(
      (context.locals[SCOPES_OBJECTS_PROPERTY] = await this.getScopesObjects(
        await this.getOrLoadScopes(context),
        context,
      )),
      context,
    )
    return context.locals[SCOPES_OBJECTS_PROPERTY] as IScope[]
  }

  protected assertScopes(scopes: Maybe<string[]>, context: Context) {
    if (!scopes) throw new ServerError('The scope is invalid', context)

    if (!Array.isArray(scopes))
      throw new ServerError(
        `The scope must be of type array but is defined as ${typeof scopes}`,
        context,
      )

    if (!scopes.every(scope => typeof scope === 'string'))
      throw new ServerError(
        'All items in the scope must be of type string',
        context,
      )
  }

  protected assertScopesObjects(scopes: Maybe<IScope[]>, context: Context) {
    if (!scopes) throw new ServerError('The object scopes is invalid', context)

    if (!Array.isArray(scopes))
      throw new ServerError(
        `The object scopes must be of type array but is defined as ${typeof scopes}`,
        context,
      )

    if (!scopes.every(scope => typeof scope === 'object'))
      throw new ServerError(
        'All items in the scope must be of type object',
        context,
      )
  }

  protected abstract getScopesObjects(
    scopes: string[],
    context: Context,
  ): PromiseToo<IScope[]>
}
