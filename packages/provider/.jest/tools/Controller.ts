import { AbstractExchanger } from '../../src/abstracts/AbstractExchanger'
import { AbstractFlow } from '../../src/abstracts/AbstractFlow'
import { AbstractGrant } from '../../src/abstracts/AbstractGrant'
import { ArrayReadOnlyToo, ConstructorOf } from '../../src/helpers/types'
import { IMPLEMENTATION_TYPE } from '../../src/interfaces/IControllerImplementation'
import { IRequest } from '../../src/interfaces/IRequest'
import { ITicket } from '../../src/interfaces/ITicket'
import { IUser } from '../../src/interfaces/IUser'
import { Controller, WalkAnd } from '../../src/models/Controller'
import { Request } from './Request'
import { Response } from './Response'

export class MockController<G extends ConstructorOf<AbstractGrant> | ArrayReadOnlyToo<ConstructorOf<AbstractGrant>>> {
  private _controller = new Controller<G extends ArrayReadOnlyToo<ConstructorOf<AbstractGrant>> ? G : [G]>()

  public static from<C extends Controller<ArrayReadOnlyToo<ConstructorOf<AbstractGrant>>>>(fn: (controller: Controller) => C | void) {
    const mockController = new this()
    fn(mockController._controller)
    return mockController
  }

  public async token(maybeRequest?: Partial<IRequest>) {
    const request = new Request(maybeRequest)
    const response = new Response()

    await this._controller.token(request, response)

    return response
  }

  public async tokenOrFail(maybeRequest?: Partial<IRequest>) {
    const response = await this.token(maybeRequest)

    if (response.status() >= 400) throw new Error("token fail");

    return response
  }

  public async release(maybeRequest?: Partial<IRequest>) {
    const request = new Request(maybeRequest)
    const response = new Response()

    await this._controller.release(request, response)

    return response
  }

  public async releaseOrFail(maybeRequest?: Partial<IRequest>) {
    const response = await this.release(maybeRequest)

    if (response.status() >= 400) throw new Error("release fail");
    if (response.status() >= 300) {
      const uri = new URL(response.headers.Location)

      if (uri.searchParams.has('error')) throw new Error(`release fail for ${uri.searchParams.get('error')} (${uri.searchParams.get('error_description')})`);
    }

    return response
  }

  public async authorize(exchanger: ConstructorOf<AbstractExchanger>, ticket: ITicket, user: IUser, maybeRequest?: Partial<IRequest>) {
    const request = new Request(maybeRequest)
    const response = new Response()

    await this._controller.authorize(exchanger, ticket, user, request, response)

    return response
  }

  public async authorizeOrFail(exchanger: ConstructorOf<AbstractExchanger>, ticket: ITicket, user: IUser, maybeRequest?: Partial<IRequest>) {
    const response = await this.authorize(exchanger, ticket, user, maybeRequest)

    if (response.status() >= 400) throw new Error("authorize fail");
    if (response.status() >= 300) {
      const uri = new URL(response.headers.Location)

      if (uri.searchParams.has('error')) throw new Error(`authorize fail for ${uri.searchParams.get('error')} (${uri.searchParams.get('error_description')})`);
    }

    return response
  }
}