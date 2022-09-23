/* eslint-disable @typescript-eslint/no-misused-promises */
import { Context, isOAuth2Error } from '@oauth2js/provider'
import { Handler } from 'express'

import { InvalidToken } from '../errors/InvalidToken'

const rule =
  /^ *(?:[Bb][Ee][Aa][Rr][Ee][Rr]) +(?<accessToken>[0-z._~+/-]+=*) *$/

export interface AuthenticateOptions {
  tratment?: 'standard' | 'next'
}

export default function authenticate({
  tratment = 'standard',
}: AuthenticateOptions = {}): Handler {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization

      if (!authorization)
        throw new InvalidToken(
          'The authorization is missing',
          new Context(req, res),
        )

      if (typeof authorization !== 'string')
        throw new InvalidToken(
          'The authorization is invalid',
          new Context(req, res),
        )

      const { accessToken } = rule.exec(authorization)?.groups ?? {}

      if (!accessToken)
        throw new InvalidToken(
          'The authorization is invalid',
          new Context(req, res),
        )

      const { getTokenByAccessToken } = req[' $oauth2js'].options

      const token = await getTokenByAccessToken(accessToken)

      if (!token)
        throw new InvalidToken(
          'The authorization is invalid',
          new Context(req, res),
        )

      if (token.accessTokenExpiresAt < new Date())
        throw new InvalidToken(
          'The authorization is expired',
          new Context(req, res),
        )

      req[' $oauth2js'].token = token

      next()
    } catch (err: unknown) {
      if (tratment === 'standard' && isOAuth2Error(err))
        res
          .status(err.status)
          .json({ error: err.error, error_description: err.description })
      else next(err)
    }
  }
}
