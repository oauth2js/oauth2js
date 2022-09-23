/* eslint-disable max-lines */
import crypto from 'crypto'

import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseAuthorizationCode,
  DatabaseClient,
  DatabaseDeviceCode,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { AuthorizationCodeGrant } from '../standards/AuthorizationCodeGrant'
import { DeviceCodeGrant } from '../standards/DeviceCodeGrant'
import { ProofKeyForCodeExchange } from '../standards/ProofKeyForCodeExchange'

describe('Proof Key for Code Exchange PKCE', () => {
  it('generate authorization code for a confidential client', async () => {
    const db = Database()

    db.clients.insertOne({
      id: 'client-test-id',
      secret: 'client-test-secret',
      redirectUris: ['http://localhost:8080'],
      type: 'confidential',
    })
    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller =>
      controller
        .use(ProofKeyForCodeExchange(AuthorizationCodeGrant))
        .implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          revokeAuthorizationCode: ({ code }) =>
            !!db.authorizationCodes.softDeleteOne(
              authorizationCode => authorizationCode.code === code,
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          saveTokenByAuthorizationCode: (token, authorizationCode) =>
            db.tokens.insertOne({ ...token, authorizationCode }),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.setHeader('Content-Type', 'text/plain')
            context.response.status(200)
            context.response.send('You autorize this test?')
          },
          isPublicClient: (client: DatabaseClient) => client.type === 'public',
          compareNonPublicClientSecret: (client: DatabaseClient, secret) =>
            client.secret === secret,
        }),
    )

    const challenge = crypto
      .randomBytes(20)
      .toString('hex')
      .split('')
      .map((char, index, { length }) =>
        (index + 1) % 4 === 0 && index + 1 !== length ? `${char}_` : char,
      )
      .join('')

    const response = await controller.release({
      query: {
        response_type: 'code',
        client_id: 'client-test-id',
        client_secret: 'client-test-secret',
        state: 'test-state',
        scope: 'read+write',
        code_challenge: crypto
          .createHash('sha256')
          .update(challenge)
          .digest('base64url'),
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(response.body).toBe('You autorize this test?')
    expect(db.authorizationCodes.count()).toBe(1)
    expect(db.authorizationCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
    })
  })

  it('with error when compareNonPublicClientSecret is not implemented', async () => {
    const db = Database()

    db.clients.insertOne({
      id: 'client-test-id',
      secret: 'client-test-secret',
      redirectUris: ['http://localhost:8080'],
      type: 'confidential',
    })
    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller =>
      controller
        .use(ProofKeyForCodeExchange(AuthorizationCodeGrant))
        .implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          revokeAuthorizationCode: ({ code }) =>
            !!db.authorizationCodes.softDeleteOne(
              authorizationCode => authorizationCode.code === code,
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          saveTokenByAuthorizationCode: (token, authorizationCode) =>
            db.tokens.insertOne({ ...token, authorizationCode }),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.setHeader('Content-Type', 'text/plain')
            context.response.status(200)
            context.response.send('You autorize this test?')
          },
          isPublicClient: (client: DatabaseClient) => client.type === 'public',
        }),
    )

    const response = await controller.release({
      query: {
        response_type: 'code',
        client_id: 'client-test-id',
        client_secret: 'client-test-secret',
        state: 'test-state',
        scope: 'read+write',
      },
    })

    expect(response.status()).toBe(302)
    expect(response.headers).toMatchSnapshot()
  })

  it('generate token', async () => {
    const db = Database()

    db.clients.insertOne({
      id: 'client-test-id',
      secret: 'client-test-secret',
      redirectUris: ['http://localhost:8080'],
    })
    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller =>
      controller
        .use(ProofKeyForCodeExchange(AuthorizationCodeGrant))
        .implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          denyAuthorizationCode: ({ code }) =>
            db.authorizationCodes.softDelete(
              authorizationCode => authorizationCode.code === code,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          revokeAuthorizationCode: ({ code }) =>
            !!db.authorizationCodes.softDeleteOne(
              authorizationCode => authorizationCode.code === code,
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          saveTokenByAuthorizationCode: (token, authorizationCode) =>
            db.tokens.insertOne({ ...token, authorizationCode }),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.setHeader('Content-Type', 'text/plain')
            context.response.status(200)
            context.response.send('You autorize this test?')
          },
          sendErrorWithInvalidClient(error, context) {
            context.response.send('Insecure client')
          },
          sendErrorWithInvalidRedirectUri(error, context) {
            context.response.send('Insecure client redirect')
          },
        }),
    )

    const challenge = crypto
      .randomBytes(20)
      .toString('hex')
      .split('')
      .map((char, index, { length }) =>
        (index + 1) % 4 === 0 && index + 1 !== length ? `${char}_` : char,
      )
      .join('')

    let response = await controller.release({
      query: {
        response_type: 'code',
        client_id: 'client-test-id',
        state: 'test-state',
        scope: 'read+write',
        code_challenge: crypto
          .createHash('sha256')
          .update(challenge)
          .digest('base64url'),
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(response.body).toBe('You autorize this test?')
    expect(db.authorizationCodes.count()).toBe(1)
    expect(db.authorizationCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      codeChallenge: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
    })

    response = await controller.authorize(
      AuthorizationCodeGrant,
      db.authorizationCodes.findOneOrFail(),
      db.users.findOneOrFail(),
    )

    const { code } =
      db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>()

    expect(response.status()).toBe(302)
    expect(response.headers).toEqual({
      Location: `http://localhost:8080/?code=${code}&state=test-state`,
    })
    expect(response.body).toBeUndefined()
    expect(db.authorizationCodes.count()).toBe(1)
    expect(db.authorizationCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      codeChallenge: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      user: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
    })

    response = await controller.token({
      body: {
        grant_type: 'authorization_code',
        code: db.authorizationCodes.findOneOrFail().code,
        redirect_uri: 'http://localhost:8080',
        client_id: 'client-test-id',
        code_verifier: challenge,
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    })
    expect(db.tokens.findOne()).toMatchSnapshot({
      accessToken: expect.any(String),
      accessTokenExpiresAt: expect.any(Date),
      refreshToken: expect.any(String),
      refreshTokenExpiresAt: expect.any(Date),
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      user: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      authorizationCode: {
        code: expect.any(String),
        codeExpiresAt: expect.any(Date),
        codeChallenge: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: expect.any(Date),
        client: {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        user: {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        scopes: [
          {
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          {
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
      },
    })
    expect(db.authorizationCodes.count({ includeDeleted: true })).toBe(1)
    expect(
      db.authorizationCodes.findOne(void 0, { includeDeleted: true }),
    ).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      codeChallenge: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      deletedAt: expect.any(Date),
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      user: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
    })
  })

  it('pkce for any exchanger', async () => {
    const db = Database()

    db.clients.insertOne({
      id: 'client-test-id',
      secret: 'client-test-secret',
      redirectUris: ['http://localhost:8080'],
    })
    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller => {
      controller.use(ProofKeyForCodeExchange(DeviceCodeGrant)).implement({
        getClientById: clientId =>
          db.clients.findOne<DatabaseClient>(client => client.id === clientId),
        getScopesObjects: scopes =>
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
        saveDeviceCode: deviceCode => db.deviceCodes.insertOne(deviceCode),
        pullingInterval: 5 * 1000,
        verificationUri: 'http://localhost:8443',
        getDeviceCodeByCode: code =>
          db.deviceCodes.findOne<DatabaseDeviceCode>(
            deviceCode => deviceCode.code === code,
          ),
        getUserByDeviceCode: (deviceCode: DatabaseDeviceCode) =>
          deviceCode.user ?? false,
        authorizeDeviceCode: ({ code }, user: DatabaseUser) =>
          void db.deviceCodes.updateOne<DatabaseDeviceCode>(
            { user },
            deviceCode => deviceCode.code === code,
          ),
        saveTokenByDeviceCode: (token, deviceCode) =>
          db.tokens.insertOne({ ...token, deviceCode }),
        revokeDeviceCode: ({ code }) =>
          !!db.deviceCodes.softDeleteOne(
            deviceCode => deviceCode.code === code,
          ),
      })
    })

    const challenge = crypto
      .randomBytes(20)
      .toString('hex')
      .split('')
      .map((char, index, { length }) =>
        (index + 1) % 4 === 0 && index + 1 !== length ? `${char}_` : char,
      )
      .join('')

    const { body: rawBody } = await controller.release({
      body: {
        response_type: 'device_code',
        client_id: 'client-test-id',
        client_secret: 'client-test-secret',
        scope: 'read+write',
        code_challenge: crypto
          .createHash('sha256')
          .update(challenge)
          .digest('base64url'),
      },
    })

    const { device_code: code } = JSON.parse(rawBody)

    expect(db.deviceCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      codeChallenge: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      userCode: expect.any(String),
      client: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      scopes: [
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
    })

    await controller.authorizeOrFail(
      DeviceCodeGrant,
      db.deviceCodes.findOneOrFail<DatabaseDeviceCode>(
        deviceCode => deviceCode.code === code,
      ),
      db.users.findOneOrFail(),
    )

    const response = await controller.token({
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: code,
        client_id: 'client-test-id',
        code_verifier: challenge,
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    })
  })

  it('throws an error when it has no algorithms', () => {
    expect(() => {
      ProofKeyForCodeExchange(AuthorizationCodeGrant, {
        algorithms: {},
      })
    }).toThrowError()
  })
})
