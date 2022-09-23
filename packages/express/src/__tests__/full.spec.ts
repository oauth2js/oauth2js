import {
  AuthorizationCodeGrant,
  ClientCredentialsGrant,
  DeviceCodeGrant,
  IToken,
  ProofKeyForCodeExchange,
  RefreshTokenGrant,
  ResourceOwnerPasswordCredentialsGrant,
} from '@oauth2js/provider'
import { Database } from '@oauth2js/provider/.jest/tools/Database'
import {
  DatabaseAuthorizationCode,
  DatabaseClient,
  DatabaseDeviceCode,
  DatabaseScope,
  DatabaseUser,
} from '@oauth2js/provider/.jest/tools/DatabaseTypes'
import Express from 'express'
import session from 'express-session'
import supertest from 'supertest'
import crypto from 'crypto'

import oauth2js from '..'

describe('Full Implementation', () => {
  const app = Express()
  const db = Database()

  const CLIENT_ID = 'client-test-id'
  const CLIENT_SECRET = 'client-test-secret'
  const CLIENT_REDIRECT_URI = 'http://localhost:8080'

  const USER_USERNAME = 'user-test-username'
  const USER_PASSWORD = 'user-test-password'

  db.users.insertOne({
    username: USER_USERNAME,
    password: USER_PASSWORD,
    client: db.clients.insertOne({
      id: CLIENT_ID,
      secret: CLIENT_SECRET,
      redirectUris: [CLIENT_REDIRECT_URI],
    }),
  })
  db.scopes.insertOne({ alias: 'read', description: 'Read' })
  db.scopes.insertOne({ alias: 'write', description: 'Write' })
  db.scopes.insertOne({ alias: 'authorize:device-code' })
  db.scopes.insertOne({ alias: 'authorize:authorization-code' })
  db.scopes.insertOne({ alias: 'deny:device-code' })
  db.scopes.insertOne({ alias: 'deny:authorization-code' })

  app.use(
    session({
      secret: 'testing',
      resave: false,
      saveUninitialized: true,
    }),
  )

  // app.use((req, res, next) => {
  //   console.log(req.headers.authorization)
  //   next()
  // })

  app.use(
    oauth2js({
      getTokenByAccessToken: accessToken =>
        db.tokens.findOne<IToken>(token => token.accessToken === accessToken),
      getRequiredScopesByNames(
        requiredScopesNames,
        allowedScopes: DatabaseScope[],
      ) {
        return allowedScopes.filter(scope =>
          requiredScopesNames.includes(scope.alias),
        )
      },
    })
      .use(ProofKeyForCodeExchange(AuthorizationCodeGrant))
      .use(DeviceCodeGrant)
      .use(ResourceOwnerPasswordCredentialsGrant)
      .use(ClientCredentialsGrant)
      .use(RefreshTokenGrant)
      .implement({
        saveToken: token => db.tokens.insertOne({ ...token }),
        saveTokenByAuthorizationCode: (token, authorizationCode) =>
          db.tokens.insertOne({ ...token, authorizationCode }),
        saveTokenByDeviceCode: (token, deviceCode) =>
          db.tokens.insertOne({ ...token, deviceCode }),
        saveTokenByRefreshedToken: (token, refreshedToken) =>
          db.tokens.insertOne({ ...token, refreshedToken }),
      })
      .implement({
        saveAuthorizationCode: authorizationCode =>
          db.authorizationCodes.insertOne(authorizationCode),
        saveDeviceCode: deviceCode => db.deviceCodes.insertOne(deviceCode),
      })
      .implement({
        sendAuthorizationCode(
          authorizationCode: DatabaseAuthorizationCode,
          { response: res },
        ) {
          res.setHeader('X-Authorization-Code', authorizationCode.code)
          res.send(`You autorize ${authorizationCode.client.id as string}?`)
        },
        sendErrorWithInvalidClient(error, { response: res }) {
          const params = new URLSearchParams({
            error: error.error,
            error_message: error.message,
          })

          res.redirect(`/authorize/error?${params.toString()}`)
        },
        sendErrorWithInvalidRedirectUri(error, { response: res }) {
          const params = new URLSearchParams({
            error: error.error,
            error_message: error.message,
          })

          res.redirect(`/authorize/error?${params.toString()}`)
        },
      })
      .implement({
        getRequestId: req => req.sessionID,
      })
      .implement({
        authorizeAuthorizationCode({ code }, user: DatabaseUser) {
          db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
            { user },
            authorizationCode => authorizationCode.code === code,
          )
        },
        authorizeDeviceCode({ code }, user: DatabaseUser) {
          db.deviceCodes.updateOne<DatabaseDeviceCode>(
            { user },
            deviceCode => deviceCode.code === code,
          )
        },
        denyDeviceCode({ code }) {
          db.authorizationCodes.softDeleteOne<DatabaseAuthorizationCode>(
            authorizationCode => authorizationCode.code === code,
          )
        },
        denyAuthorizationCode({ code }) {
          db.deviceCodes.softDeleteOne<DatabaseDeviceCode>(
            deviceCode => deviceCode.code === code,
          )
        },
      })
      .implement({
        getClientById: clientId =>
          db.clients.findOne<DatabaseClient>(client => client.id === clientId),
      })
      .implement({
        getUserByClient: client =>
          db.users.findOne<DatabaseUser>(user => user.client === client),
      })
      .implement({
        getUserByCredentials: ({ username, password }) =>
          db.users.findOne<DatabaseUser>(
            user => user.username === username && user.password === password,
          ),
      })
      .implement({
        getUserByDeviceCode: (deviceCode: DatabaseDeviceCode) =>
          deviceCode.user ?? false,
      })
      .implement({
        getScopesObjects: scopes =>
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
      })
      .implement({
        getTokenByRefreshToken: refreshToken =>
          db.tokens.findOne<IToken>(
            token => token.refreshToken === refreshToken,
          ),
      })
      .implement({
        revokeToken: ({ accessToken }) =>
          !!db.tokens.softDeleteOne(token => token.accessToken === accessToken),
      })
      .implement({
        getAuthorizationCodeByCode: code =>
          db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
            authorizationCode => authorizationCode.code === code,
          ),
      })
      .implement({
        getUserByAuthorizationCode: (
          authorizationCode: DatabaseAuthorizationCode,
        ) => authorizationCode.user,
      })
      .implement({
        revokeAuthorizationCode: ({ code }) =>
          !!db.authorizationCodes.softDeleteOne(
            authorizationCode => authorizationCode.code === code,
          ),
      }),
  )

  app.post('/oauth2/token', oauth2js.token())

  app
    .route('/oauth2/authorize')
    .get(oauth2js.release())
    .post(oauth2js.release())

  app.post(
    '/oauth2/device-code/:code/authorize',
    oauth2js.authenticate(),
    oauth2js.scope('authorize:device-code'),
    oauth2js.authorize(DeviceCodeGrant, {
      getTicket: req =>
        db.deviceCodes.findOneOrFail<DatabaseDeviceCode>(
          authorizationCode => authorizationCode.code === req.params.code,
        ),
      getUser: req => req.user as OAuth2JS.Server.User,
    }),
  )

  app.post(
    '/oauth2/device-code/:code/deny',
    oauth2js.authenticate(),
    oauth2js.scope('deny:device-code'),
    oauth2js.deny(DeviceCodeGrant, {
      getTicket: req =>
        db.deviceCodes.findOneOrFail<DatabaseDeviceCode>(
          authorizationCode => authorizationCode.code === req.params.code,
        ),
    }),
  )

  app.post(
    '/oauth2/authorization-code/:code/authorize',
    oauth2js.authenticate(),
    oauth2js.scope('authorize:authorization-code'),
    oauth2js.authorize(AuthorizationCodeGrant, {
      getTicket: req =>
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === req.params.code,
        ),
      getUser: req => req.user as OAuth2JS.Server.User,
    }),
  )

  app.post(
    '/oauth2/authorization-code/:code/deny',
    oauth2js.authenticate(),
    oauth2js.scope('deny:authorization-code'),
    oauth2js.deny(AuthorizationCodeGrant, {
      getTicket: req =>
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === req.params.code,
        ),
    }),
  )

  it('ResourceOwnerPasswordCredentialsGrant', async () => {
    const response = await supertest(app)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username: USER_USERNAME,
        password: USER_PASSWORD,
        scope: 'read+write',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 7200,
      refresh_token: expect.any(String),
    })
  })

  it('RefreshTokenGrant < ResourceOwnerPasswordCredentialsGrant', async () => {
    const {
      body: { refresh_token: refreshToken },
    } = await supertest(app)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username: USER_USERNAME,
        password: USER_PASSWORD,
        scope: 'read+write',
      })
      .expect(200)

    const response = await supertest(app)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 7200,
      refresh_token: expect.any(String),
    })
  })

  it('ClientCredentialsGrant', async () => {
    const response = await supertest(app)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'read+write',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 7200,
      refresh_token: null,
    })
  })

  it('AuthorizationCodeGrant with ProofKeyForCodeExchange', async () => {
    const challenge = crypto
      .randomBytes(20)
      .toString('hex')
      .split('')
      .map((char, index, { length }) =>
        (index + 1) % 4 === 0 && index + 1 !== length ? `${char}_` : char,
      )
      .join('')

    const {
      headers: { 'x-authorization-code': code },
    } = await supertest(app)
      .get('/oauth2/authorize')
      .query({
        response_type: 'code',
        client_id: CLIENT_ID,
        state: 'test-state',
        scope: 'read+write',
        code_challenge: crypto
          .createHash('sha256')
          .update(challenge)
          .digest('base64url'),
      })

    expect(code).toEqual(expect.any(String))

    const {
      body: { access_token: accessToken, token_type: tokenType },
    } = await supertest(app)
      .post(`/oauth2/token`)
      .type('form')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'authorize:authorization-code',
      })
      .expect(200)

    await supertest(app)
      .post(`/oauth2/authorization-code/${code}/authorize`)
      .set({
        Authorization: `${tokenType} ${accessToken}`,
      })
      .send()
      .expect(302)

    const response = await supertest(app)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CLIENT_REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: challenge,
      })
      .expect(200)

    expect(response.body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 7200,
      refresh_token: expect.any(String),
    })
  })
})
