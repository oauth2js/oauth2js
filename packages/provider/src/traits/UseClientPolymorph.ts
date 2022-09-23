import { Mixed } from '@prunus/mixin'

import {
  PromiseToo,
  Maybe,
  AbstractConstructorOf,
  ArrayInfer,
} from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { Context } from '../models/Context'
import { UseClient } from './UseClient'

export type UseClientConstructor = AbstractConstructorOf<UseClient>

export abstract class UseClientPolymorphClass<
  C extends UseClientConstructor[],
> {
  protected abstract selectUseClientProvider(context: Context): ArrayInfer<C>
}

export function UseClientPolymorph<
  T1 extends UseClientConstructor,
  T2 extends UseClientConstructor,
>(
  ...list: [T1, T2]
): AbstractConstructorOf<
  UseClientPolymorphClass<[T1, T2]> & InstanceType<T1> & InstanceType<T2>
>

export function UseClientPolymorph<
  T1 extends UseClientConstructor,
  T2 extends UseClientConstructor,
  T3 extends UseClientConstructor,
>(
  ...list: [T1, T2, T3]
): AbstractConstructorOf<
  UseClientPolymorphClass<[T1, T2, T3]> &
    InstanceType<T1> &
    InstanceType<T2> &
    InstanceType<T3>
>

export function UseClientPolymorph(...list: UseClientConstructor[]) {
  abstract class UseClientPolymorph extends Mixed(
    UseClientPolymorphClass,
    ...(list as [AbstractConstructorOf<UseClient>]),
  ) {
    protected override getClient(context: Context): PromiseToo<Maybe<IClient>> {
      const provider = this.selectUseClientProvider(context)

      return this.supers.for(provider).getClient(context)
    }
  }

  return UseClientPolymorph
}
