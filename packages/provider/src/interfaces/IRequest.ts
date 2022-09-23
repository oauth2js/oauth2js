export enum RequestLocation {
  Query = 'query',
  Body = 'body',
}

type IfIn<K extends string | symbol | number, T, E> = T extends {
  [TK in K]: infer I
}
  ? I
  : E

export interface IRequest extends OAuth2JS.Server.Request {
  headers: IfIn<'headers', OAuth2JS.Server.Request, Record<string, unknown>>
  query: IfIn<'query', OAuth2JS.Server.Request, Record<string, unknown>>
  body: IfIn<'body', OAuth2JS.Server.Request, Record<string, unknown>>
}

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Request {}
    }
  }
}
