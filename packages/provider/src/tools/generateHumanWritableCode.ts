const HUMANLY_EASY_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const DEFAULT_HUMAN_WRITABLE_CODE_SIZE = 10

const random = (chars: string) =>
  chars.charAt(Math.floor(Math.random() * chars.length))

export const generateHumanWritableCode = (
  size = DEFAULT_HUMAN_WRITABLE_CODE_SIZE,
  chars = HUMANLY_EASY_CHARACTERS,
) =>
  Array(size)
    .fill(null)
    .reduce<string>(text => `${text}${random(chars)}`, '')
