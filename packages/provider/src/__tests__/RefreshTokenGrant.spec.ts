import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseClient,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { IToken } from '../interfaces/IToken'
import { RefreshTokenGrant } from '../standards/RefreshTokenGrant'
import { ResourceOwnerPasswordCredentialsGrant } from '../standards/ResourceOwnerPasswordCredentialsGrant'

describe('Refresh Token Grant', () => {
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
        .use(ResourceOwnerPasswordCredentialsGrant)
        .use(RefreshTokenGrant)
        .implement({
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
          getUserByCredentials: credentials =>
            db.users.findOne<DatabaseUser>(
              user =>
                user.username === credentials.username &&
                user.password === credentials.password,
            ),
          saveToken: token => db.tokens.insertOne(token),
          getTokenByRefreshToken: refreshToken =>
            db.tokens.findOne<IToken>(
              token => token.refreshToken === refreshToken,
            ),
          revokeToken: ({ accessToken }) =>
            !!db.tokens.softDeleteOne(
              token => token.accessToken === accessToken,
            ),
          saveTokenByRefreshedToken: (token, refreshedToken) =>
            db.tokens.insertOne({ ...token, token: refreshedToken }),
        }),
    )

    const headers = {
      Authorization: `Basic ${Buffer.from(
        'client-test-id:client-test-secret',
      ).toString('base64')}`,
    }
    const body = {
      grant_type: 'password',
      username: 'user-test-username',
      password: 'user-test-password',
      scope: 'read+write',
    }
    let response = await controller.token({ headers, body })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    })

    expect(db.tokens.count()).toBe(1)
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
    })

    response = await controller.token({
      body: {
        grant_type: 'refresh_token',
        refresh_token: db.tokens.findOneOrFail().refreshToken,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    })
    expect(db.tokens.count({ includeDeleted: true })).toBe(2)
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
      token: {
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
        deletedAt: expect.any(Date),
      },
    })
  })

  it('with error when getTokenByRefreshToken is not implemented', async () => {
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
        .use(ResourceOwnerPasswordCredentialsGrant)
        .use(RefreshTokenGrant)
        .implement({
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
          getUserByCredentials: credentials =>
            db.users.findOne<DatabaseUser>(
              user =>
                user.username === credentials.username &&
                user.password === credentials.password,
            ),
          saveToken: token => db.tokens.insertOne(token),
        }),
    )

    const headers = {
      Authorization: `Basic ${Buffer.from(
        'client-test-id:client-test-secret',
      ).toString('base64')}`,
    }
    const { body } = await controller.tokenOrFail({
      headers,
      body: {
        grant_type: 'password',
        username: 'user-test-username',
        password: 'user-test-password',
        scope: 'read+write',
      },
    })

    const { refresh_token: refreshToken } = JSON.parse(body)
    const response = await controller.token({
      body: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(500)
    expect(JSON.parse(response.body)).toMatchSnapshot()
  })

  it.todo(
    'with error when saveToken or saveTokenByRefreshedToken is not implemented',
  )

  it('with error when revokeToken is not implemented', async () => {
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
        .use(ResourceOwnerPasswordCredentialsGrant)
        .use(RefreshTokenGrant)
        .implement({
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
          getUserByCredentials: credentials =>
            db.users.findOne<DatabaseUser>(
              user =>
                user.username === credentials.username &&
                user.password === credentials.password,
            ),
          saveToken: token => db.tokens.insertOne(token),
          getTokenByRefreshToken: refreshToken =>
            db.tokens.findOne<IToken>(
              token => token.refreshToken === refreshToken,
            ),
        }),
    )

    const headers = {
      Authorization: `Basic ${Buffer.from(
        'client-test-id:client-test-secret',
      ).toString('base64')}`,
    }
    const { body } = await controller.tokenOrFail({
      headers,
      body: {
        grant_type: 'password',
        username: 'user-test-username',
        password: 'user-test-password',
        scope: 'read+write',
      },
    })

    const { refresh_token: refreshToken } = JSON.parse(body)
    const response = await controller.token({
      body: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(500)
    expect(JSON.parse(response.body)).toMatchSnapshot()
  })
})
