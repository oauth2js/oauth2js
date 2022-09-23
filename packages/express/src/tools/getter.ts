export default function getter<T>(
  object: T,
  properties: Record<string, (this: T, self: T) => unknown>,
) {
  Object.entries(properties).forEach(([property, get]) => {
    Object.defineProperty(object, property, {
      enumerable: false,
      configurable: false,
      get(this: T) {
        return get.call(this, this)
      },
    })
  })
}
