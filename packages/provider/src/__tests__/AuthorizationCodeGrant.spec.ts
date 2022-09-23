/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable max-lines */
/* eslint-disable capitalized-comments */
/* eslint-disable multiline-comment-style */
import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseAuthorizationCode,
  DatabaseClient,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { IClient } from '../interfaces/IClient'
import { AuthorizationCodeGrant } from '../standards/AuthorizationCodeGrant'

describe('Authorization Code Grant', () => {
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
      controller.use(AuthorizationCodeGrant).implement({
        getClientById: clientId =>
          db.clients.findOne<DatabaseClient>(client => client.id === clientId),
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
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
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
      }),
    )

    let response = await controller.release({
      query: {
        response_type: 'code',
        client_id: 'client-test-id',
        state: 'test-state',
        scope: 'read+write',
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

  it('with error when no client provider is implemented', async () => {
    const controller = MockController.from(controller => {
      controller.use(AuthorizationCodeGrant).implement({
        sendErrorWithInvalidClient(error, context) {
          context.response.status(error.status)
          context.response.setHeader('Content-Type', 'application/json')
          context.response.send(
            JSON.stringify({
              error: error.error,
              error_description: error.message,
            }),
          )
        },
      })
    })

    const response = await controller.release({
      query: {
        response_type: 'code',
        client_id: 'client-test-id',
        state: 'test-state',
        scope: 'read+write',
      },
    })

    expect(response.status()).toBe(500)
    expect(JSON.parse(response.body)).toMatchSnapshot()
  })

  {
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

    it('with error when getScopesObjects is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(302)
      expect(response.headers).toMatchSnapshot()
    })

    it('with error when no client is found', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          sendErrorWithInvalidClient(error, context) {
            context.response.status(error.status)
            context.response.setHeader('Content-Type', 'application/json')
            context.response.send(
              JSON.stringify({
                error: error.error,
                error_description: error.message,
              }),
            )
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'non-client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(401)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when found client does not have redirect uri', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            ({
              id: `${clientId}-without-redirect-uris`,
              redirectUris: null,
            } as IClient),
          sendErrorWithInvalidRedirectUri(error, context) {
            context.response.status(error.status)
            context.response.setHeader('Content-Type', 'application/json')
            context.response.send(
              JSON.stringify({
                error: error.error,
                error_description: error.message,
              }),
            )
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when found client has no redirect uri', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            ({
              id: `${clientId}-without-redirect-uris-length`,
              redirectUris: [],
            } as IClient),
          sendErrorWithInvalidRedirectUri(error, context) {
            context.response.status(error.status)
            context.response.setHeader('Content-Type', 'application/json')
            context.response.send(
              JSON.stringify({
                error: error.error,
                error_description: error.message,
              }),
            )
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it.each([null, 123, { object: true }, Symbol('symbol'), ['array']])(
      'with error when the client found contains a %p instead of a string in the redirect uri',
      async item => {
        const controller = MockController.from(controller => {
          controller.use(AuthorizationCodeGrant).implement({
            getClientById: clientId =>
              ({
                id: `${clientId}-without-redirect-uris-length`,
                redirectUris: [item],
              } as IClient),
            sendErrorWithInvalidRedirectUri(error, context) {
              context.response.status(error.status)
              context.response.setHeader('Content-Type', 'application/json')
              context.response.send(
                JSON.stringify({
                  error: error.error,
                  error_description: error.message,
                }),
              )
            },
          })
        })

        const response = await controller.release({
          query: {
            response_type: 'code',
            client_id: 'client-test-id',
            state: 'test-state',
            scope: 'read+write',
          },
        })

        expect(response.status()).toBe(500)
        expect(JSON.parse(response.body)).toMatchSnapshot()
      },
    )

    it('with error when request redirect uri does not match that of client', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          sendErrorWithInvalidRedirectUri(error, context) {
            context.response.status(error.status)
            context.response.setHeader('Content-Type', 'application/json')
            context.response.send(
              JSON.stringify({
                error: error.error,
                error_description: error.message,
              }),
            )
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
          redirect_uri: 'http://non-localhost:8080',
        },
      })

      expect(response.status()).toBe(400)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when saveAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(302)
      expect(response.headers).toMatchSnapshot()
    })

    it('with error when sendAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(302)
      expect(response.headers).toMatchSnapshot()
    })

    it('minimal generate authorization code by client id', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send('Ok')
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(200)
      expect(response.body).toBe('Ok')
    })

    it('minimal generate authorization code by client credentials', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientByCredentials: credentials =>
            db.clients.findOne<DatabaseClient>(
              client =>
                client.id === credentials.id &&
                client.secret === credentials.secret,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send('Ok')
          },
        })
      })

      const response = await controller.release({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          client_secret: 'client-test-secret',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      expect(response.status()).toBe(200)
      expect(response.body).toBe('Ok')
    })

    it('with error when authorizeAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
        })
      })
      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      const response = await controller.authorize(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      expect(response.status()).toBe(302)
      expect(response.headers).toMatchSnapshot()
    })

    it('with error when getAuthorizationCodeByCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
        })
      })

      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      await controller.authorizeOrFail(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      const response = await controller.token({
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: 'client-test-id',
          redirect_uri: 'http://localhost:8080',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when getUserByAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
        })
      })

      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      await controller.authorizeOrFail(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      const response = await controller.token({
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: 'client-test-id',
          redirect_uri: 'http://localhost:8080',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when revokeAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
        })
      })

      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      await controller.authorizeOrFail(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      const response = await controller.token({
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: 'client-test-id',
          redirect_uri: 'http://localhost:8080',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('with error when saveToken or saveTokenByAuthorizationCode is not implemented', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
          revokeAuthorizationCode: ({ code }) =>
            !!db.authorizationCodes.softDeleteOne(
              authorizationCode => authorizationCode.code === code,
            ),
        })
      })

      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      await controller.authorizeOrFail(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      const response = await controller.token({
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: 'client-test-id',
          redirect_uri: 'http://localhost:8080',
        },
      })

      expect(response.status()).toBe(500)
      expect(JSON.parse(response.body)).toMatchSnapshot()
    })

    it('minimal generate token', async () => {
      const controller = MockController.from(controller => {
        controller.use(AuthorizationCodeGrant).implement({
          getClientById: clientId =>
            db.clients.findOne<DatabaseClient>(
              client => client.id === clientId,
            ),
          getScopesObjects: scopes =>
            db.scopes.find<DatabaseScope>(scope =>
              scopes.includes(scope.alias),
            ),
          saveAuthorizationCode: authorizationCode =>
            db.authorizationCodes.insertOne(authorizationCode),
          sendAuthorizationCode(authorizationCode, context) {
            context.response.status(200)
            context.response.send(authorizationCode.code)
          },
          authorizeAuthorizationCode: ({ code }, user: DatabaseUser) =>
            void db.authorizationCodes.updateOne<DatabaseAuthorizationCode>(
              { user },
              authorizationCode => authorizationCode.code === code,
            ),
          getAuthorizationCodeByCode: code =>
            db.authorizationCodes.findOne<DatabaseAuthorizationCode>(
              authorizationCode => authorizationCode.code === code,
            ),
          getUserByAuthorizationCode: (
            authorizationCode: DatabaseAuthorizationCode,
          ) => authorizationCode.user,
          revokeAuthorizationCode: ({ code }) =>
            !!db.authorizationCodes.softDeleteOne(
              authorizationCode => authorizationCode.code === code,
            ),
          saveToken: token => db.tokens.insertOne(token),
        })
      })

      const { body: code } = await controller.releaseOrFail({
        query: {
          response_type: 'code',
          client_id: 'client-test-id',
          state: 'test-state',
          scope: 'read+write',
        },
      })

      await controller.authorizeOrFail(
        AuthorizationCodeGrant,
        db.authorizationCodes.findOneOrFail<DatabaseAuthorizationCode>(
          authorizationCode => authorizationCode.code === code,
        ),
        db.users.findOneOrFail(),
      )

      const response = await controller.token({
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: 'client-test-id',
          redirect_uri: 'http://localhost:8080',
        },
      })

      expect(response.status()).toBe(200)
      expect(JSON.parse(response.body)).toMatchSnapshot({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      })
    })
  }
})
