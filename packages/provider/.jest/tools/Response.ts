import { IResponse } from "../../src/interfaces/IResponse";

export class Response {
  private _status: number = NaN

  public headers: Record<string, string> = {}

  public body: any

  setHeader(name: string, value: string) {
    this.headers[name] = value
  }
  status(): number
  status(status: number): void
  status(status?: number) {
    if (status === undefined) return this._status
    this._status = status
  }
  send(body?: string | undefined) {
    this.body = body
  }
}

export interface Response extends IResponse {}
