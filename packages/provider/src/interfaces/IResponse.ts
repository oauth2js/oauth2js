export interface IResponse extends OAuth2JS.Server.Response {
  setHeader(name: string, value: string): unknown
  status(status: number): unknown
  send(body?: string): unknown
}

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Response {}
    }
  }
}
