export async function generateRandomToken() {
  const crypto = await import('crypto')

  return crypto.createHash('sha1').update(crypto.randomBytes(256)).digest('hex')
}
