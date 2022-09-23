/* eslint-disable @typescript-eslint/no-misused-promises */
import { Context, isOAuth2Error } from '@oauth2js/provider'
import { ServerError } from '@oauth2js/provider/src/errors/ServerError'
import { Handler } from 'express'

import { InvalidToken } from '../errors/InvalidToken'

export interface ScopeOptions {
  tratment?: 'standard' | 'next'
}

export default function scope(
  scopesNames: [string, ...string[]] | string,
  { tratment = 'standard' }: ScopeOptions = {},
): Handler {
  return async (req, res, next) => {
    try {
      if (!req.token)
        throw new ServerError(
          'Scope handler calling without authenticate',
          new Context(req, res),
        )

      const { getRequiredScopesByNames } = req[' $oauth2js'].options

      const list = Array.isArray(scopesNames) ? scopesNames : [scopesNames]

      const scopes = await getRequiredScopesByNames(list, req.token.scopes)

      if (list.length !== scopes.length)
        throw new InvalidToken('Insufficient scope', new Context(req, res))

      scopes.forEach(scope => req[' $oauth2js'].scopesInUse.add(scope))

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
