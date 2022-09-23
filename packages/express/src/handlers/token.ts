import { Handler } from 'express'

export default function token(): Handler {
  return (req, res, next) => {
    req[' $oauth2js'].controller.token(req, res).catch(next)
  }
}
