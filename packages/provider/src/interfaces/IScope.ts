export type IScope = OAuth2JS.Server.Scope

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Scope {}
    }
  }
}
