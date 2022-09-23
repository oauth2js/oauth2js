import { ILocals } from '../interfaces/ILocals'
import { IRequest } from '../interfaces/IRequest'
import { IResponse } from '../interfaces/IResponse'

export class Context {
  public locals: ILocals = {}

  constructor(public request: IRequest, public response: IResponse) {}
}
