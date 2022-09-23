import { PromiseToo } from '../helpers/types'
import { Context } from '../models/Context'

export abstract class UseCodeLifetimeGenerator {
  protected abstract readonly codeLifetime: number

  protected getCodeExpiresAt(context: Context): PromiseToo<Date>
  protected getCodeExpiresAt(): PromiseToo<Date> {
    return new Date(Date.now() + this.codeLifetime)
  }
}
