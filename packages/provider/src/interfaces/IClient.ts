export interface IClient extends OAuth2JS.Server.Client {
  id: unknown
}

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Client {}
    }
  }
}
