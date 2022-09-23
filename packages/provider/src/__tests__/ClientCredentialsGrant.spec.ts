import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseClient,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { ClientCredentialsGrant } from '../standards/ClientCredentialsGrant'

describe('Client Credentials Grant', () => {
  it('generate token', async () => {
    const db = Database()

    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
      client: db.clients.insertOne({
        id: 'client-test-id',
        secret: 'client-test-secret',
        redirectUris: ['http://localhost:8080'],
      }),
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller =>
      controller.use(ClientCredentialsGrant).implement({
        getClientByCredentials: credentials =>
          db.clients.findOne<DatabaseClient>(
            client =>
              client.id === credentials.id &&
              client.secret === credentials.secret,
          ),
        getScopesObjects: scopes =>
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
        getUserByClient: client =>
          db.users.findOne<DatabaseUser>(user => user.client === client),
        saveToken: token => db.tokens.insertOne(token),
      }),
    )

    const headers = {
      Authorization: `Basic ${Buffer.from(
        'client-test-id:client-test-secret',
      ).toString('base64')}`,
    }
    const body = {
      grant_type: 'client_credentials',
      scope: 'read+write',
    }
    const response = await controller.token({ headers, body })

    expect(response.status()).toBe(200)
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
    })
    expect(db.tokens.findOne()).toMatchSnapshot({
      accessToken: expect.any(String),
      accessTokenExpiresAt: expect.any(Date),
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
        client: {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      },
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })

  it('generate token with refresh token', async () => {
    const db = Database()

    db.users.insertOne({
      username: 'user-test-username',
      password: 'user-test-password',
      client: db.clients.insertOne({
        id: 'client-test-id',
        secret: 'client-test-secret',
        redirectUris: ['http://localhost:8080'],
      }),
    })
    db.scopes.insertOne({ alias: 'read', description: 'Read' })
    db.scopes.insertOne({ alias: 'write', description: 'Write' })

    const controller = MockController.from(controller => {
      controller.use(ClientCredentialsGrant).implement({
        getClientByCredentials: credentials =>
          db.clients.findOne<DatabaseClient>(
            client =>
              client.id === credentials.id &&
              client.secret === credentials.secret,
          ),
        getScopesObjects: scopes =>
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
        getUserByClient: client =>
          db.users.findOne<DatabaseUser>(user => user.client === client),
        saveToken: token => db.tokens.insertOne(token),
        generateRefreshTokenForClientCredentials: true,
      })
    })

    const headers = {
      Authorization: `Basic ${Buffer.from(
        'client-test-id:client-test-secret',
      ).toString('base64')}`,
    }
    const body = {
      grant_type: 'client_credentials',
      scope: 'read+write',
    }
    const response = await controller.token({ headers, body })

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
        client: {
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      },
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })
})
