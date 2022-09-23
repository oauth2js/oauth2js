const BASIC = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +(?<token>[0-z._~+/-]+=*) *$/
const CREDENTIALS = /^(?<name>[^:]*):(?<pass>.*)$/

export const getBasicCredentialsFromAuthorization = (authorization: string) => {
  if (!authorization) return null

  if (typeof authorization !== 'string') return null

  const { token } = BASIC.exec(authorization)?.groups ?? {}

  if (!token) return null

  const { name, pass } =
    CREDENTIALS.exec(Buffer.from(token, 'base64').toString('utf-8'))?.groups ??
    {}

  if (!name || !pass) return null

  return { name, pass }
}
