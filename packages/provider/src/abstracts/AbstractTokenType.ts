import { IToken } from '../interfaces/IToken'
import { snakelize } from '../tools/snakelize'

const rule = /(^Token|Type$)/g

export abstract class AbstractTokenType {
  public type = snakelize(this.constructor.name.replace(rule, ''))

  public abstract toJSON(token: IToken): Record<string, unknown>
}
