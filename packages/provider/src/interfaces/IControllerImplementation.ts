export declare const IMPLEMENTATION_TYPE: unique symbol

export type IMPLEMENTATION_TYPE = typeof IMPLEMENTATION_TYPE

export interface IControllerImplementation<T> {
  [IMPLEMENTATION_TYPE]?: T
}

export type IncrementControllerImplementation<A, I> =
  A extends IControllerImplementation<infer T>
    ? IControllerImplementation<T & I>
    : IControllerImplementation<I>
