/* eslint-disable @typescript-eslint/no-explicit-any */
export type PromiseToo<T> = T | Promise<T>

export type Maybe<T> = T | null

export type ConstructorOf<T, A extends any[] = any[]> = new (...args: A) => T

export type ArrayReadOnlyToo<T> = T[] | readonly T[]

export type ArrayInfer<T extends ArrayReadOnlyToo<unknown>> =
  T extends ArrayReadOnlyToo<infer I> ? I : never

export type AbstractConstructorOf<T, A extends any[] = any[]> = abstract new (
  ...args: A
) => T

export type AbstractToo<T extends ConstructorOf<any>> = T extends ConstructorOf<
  infer I,
  infer A
>
  ? I | AbstractConstructorOf<I, A>
  : never
