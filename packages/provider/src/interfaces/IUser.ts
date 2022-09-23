export type IUser = OAuth2JS.Server.User

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface User {}
    }
  }
}
