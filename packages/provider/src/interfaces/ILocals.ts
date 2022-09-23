export interface ILocals extends OAuth2JS.Server.Context.Locals {
  [key: string | symbol]: unknown
}

declare global {
  namespace OAuth2JS {
    namespace Server {
      namespace Context {
        interface Locals {}
      }
    }
  }
}
