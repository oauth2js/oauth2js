import {
  AbstractGrant,
  Controller,
  IClient,
  IScope,
  IToken,
  IUser,
} from '@oauth2js/provider'
import {
  ArrayInfer,
  ArrayReadOnlyToo,
  ConstructorOf,
  Maybe,
  PromiseToo,
} from '@oauth2js/provider/src/helpers/types'
import { ImplementationOf } from '@oauth2js/provider/src/models/Controller'
import {
  Handler,
  Request as ExpressRequest,
  Response as ExpressResponse,
  Router,
  urlencoded,
} from 'express'

import authenticate from './handlers/authenticate'
import authorize from './handlers/authorize'
import deny from './handlers/deny'
import release from './handlers/release'
import scope from './handlers/scope'
import token from './handlers/token'
import getter from './tools/getter'

interface OAuth2JSHandler<
  G extends ArrayReadOnlyToo<ConstructorOf<AbstractGrant>> = [],
> extends Handler {
  use<T extends ConstructorOf<AbstractGrant>>(
    grant: T,
  ): OAuth2JSHandler<[...G, T]>
  implement(implementations: ImplementationOf<G>): this
  implement<T extends ArrayReadOnlyToo<ArrayInfer<G>>>(
    implementations: ImplementationOf<T>,
    targets: T,
  ): this
}

export interface OAuth2JSOptions {
  urlencoded?: Parameters<typeof urlencoded>[0] | false | true
  getTokenByAccessToken(accessToken: string): PromiseToo<Maybe<IToken>>
  getRequiredScopesByNames(
    requiredScopesNames: string[],
    allowedScopes: IScope[],
  ): PromiseToo<IScope[]>
}

export default function oauth2js({
  urlencoded: useUrlencoded = true,
  getTokenByAccessToken,
  getRequiredScopesByNames,
}: OAuth2JSOptions): OAuth2JSHandler {
  const controller = new Controller<
    ArrayReadOnlyToo<ConstructorOf<AbstractGrant>>
  >()
  const router = Router()

  router.use(
    [
      useUrlencoded &&
        urlencoded({
          extended: false,
          ...(typeof useUrlencoded === 'object' && useUrlencoded),
        }),
    ].filter(<T>(item: T): item is Exclude<T, false> => !!item),
  )

  router.use((req, res, next) => {
    req[' $oauth2js'] = {
      controller,
      scopesInUse: new Set(),
      options: {
        getTokenByAccessToken,
        getRequiredScopesByNames,
      },
    }

    getter(req, {
      token: req => req[' $oauth2js'].token ?? null,
      user: req => req.token?.user ?? null,
      client: req => req.token?.client ?? null,
      scopes: req => req.token?.scopes ?? null,
    })

    next()
  })

  function use<T extends ConstructorOf<AbstractGrant>>(
    this: OAuth2JSHandler,
    grant: T,
  ) {
    controller.use(grant)

    return this
  }

  function implement(this: OAuth2JSHandler, ...args: [never, never]) {
    controller.implement.call(controller, ...args)

    return this
  }

  const oauth2js: Handler = (req, res, next) => {
    router(req, res, next)
  }

  return Object.assign(oauth2js, { use, implement }) as OAuth2JSHandler
}

oauth2js.authorize = authorize
oauth2js.deny = deny
oauth2js.token = token
oauth2js.release = release
oauth2js.authenticate = authenticate
oauth2js.scope = scope

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Request extends ExpressRequest {}
      interface Response extends ExpressResponse {}
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      readonly token: IToken | null
      readonly user: IUser | null
      readonly client: IClient | null
      readonly scopes: IScope[] | null
      [' $oauth2js']: {
        token?: IToken
        scopesInUse: Set<IScope>
        controller: Controller
        options: Pick<
          OAuth2JSOptions,
          'getTokenByAccessToken' | 'getRequiredScopesByNames'
        >
      }
    }
  }
}
