import { PromiseToo } from '../helpers/types'
import { Controller } from './Controller'

export class ExposeControllerConnection {
  protected readonly controller!: Controller

  protected whenBeingAttached(controller: Controller): PromiseToo<void> {
    // @ts-expect-error: The controller is only defined when the `whenBeingAttached` function in the grant or flow inclusion is called in the controller.
    this.controller = controller
  }
}
