const rule = /(?:^\w|[A-Z0-9]|\b\w)/g

const replace = (word: string, index: string) =>
  index ? `_${word.toLowerCase()}` : word.toLowerCase()

export const snakelize = (str: string) => str.replace(rule, replace)
