import { IRequest } from "../../src/interfaces/IRequest";

export class Request {
  headers: Record<string, string> = {};
  query: Record<string, unknown> = {};
  body: Record<string, unknown> = {};

  constructor(request: Partial<IRequest> = {}) {
    Object.assign(this, request)
    this.headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...request?.headers }
  }
}

export interface Request extends IRequest {}
