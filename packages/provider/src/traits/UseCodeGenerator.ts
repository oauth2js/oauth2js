import { PromiseToo } from '../helpers/types'
import { Context } from '../models/Context'
import { generateRandomToken } from '../tools/generateRandomToken'

export class UseCodeGenerator {
  protected generateCode(context: Context): PromiseToo<string>
  protected generateCode(): PromiseToo<string> {
    return generateRandomToken()
  }
}
