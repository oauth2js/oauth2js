import { Handler } from 'express'

export default function release(): Handler {
  return (req, res, next) => {
    req[' $oauth2js'].controller.release(req, res).catch(next)
  }
}
