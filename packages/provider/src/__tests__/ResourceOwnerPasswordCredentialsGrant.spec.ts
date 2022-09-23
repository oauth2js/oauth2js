import strikethrough from 'ansi-strikethrough'

import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseClient,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { ResourceOwnerPasswordCredentialsGrant } from '../standards/ResourceOwnerPasswordCredentialsGrant'

const omit = <T, K extends keyof T>(target: T, ...keys: K[]): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(target as Record<keyof T, unknown>).filter(
      ([key]) => !keys.includes(key as K),
    ),
  ) as Omit<T, K>

describe('Resource Owner Password Credentials Grant', () => {
  const db = Database()

  db.clients.insertOne({ id: 'client-test-id', secret: 'client-test-secret' })
  db.users.insertOne({
    username: 'user-test-username',
    password: 'user-test-password',
  })
  db.scopes.insertOne({ alias: 'read', description: 'Read' })
  db.scopes.insertOne({ alias: 'write', description: 'Write' })

  const controller = MockController.from(controller =>
    controller.use(ResourceOwnerPasswordCredentialsGrant).implement({
      getClientByCredentials: credentials =>
        db.clients.findOne<DatabaseClient>(
          client =>
            client.id === credentials.id &&
            client.secret === credentials.secret,
        ),
      getScopesObjects: scopes =>
        db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
      getUserByCredentials: credentials =>
        db.users.findOne<DatabaseUser>(
          user =>
            user.username === credentials.username &&
            user.password === credentials.password,
        ),
      saveToken: token => db.tokens.insertOne(token),
    }),
  )

  beforeEach(() => db.tokens.softDelete())

  it.each(
    (body =>
      Object.entries(body).map(entry => ({
        entry,
        body: omit(body, entry[0] as keyof typeof body),
      })))({
      grant_type: 'password',
      client_id: 'client-test-id',
      client_secret: 'client-test-secret',
      username: 'user-test-username',
      password: 'user-test-password',
      scope: 'read+write',
    }),
  )(
    `response error for missing property $entry.0 = ${strikethrough(
      '"$entry.1"',
    )} in body`,
    async ({ body }) => {
      const response = await controller.token({ body })

      expect(response.status()).toBe(400)
      expect(response.headers).toMatchSnapshot()
      expect(JSON.parse(response.body)).toMatchSnapshot({
        error: 'invalid_request',
      })
      expect(db.tokens.count()).toBe(0)
    },
  )

  it('generate a token with basic authorization', async () => {
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
      },
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })

  it('generate a token with body autorization', async () => {
    const body = {
      grant_type: 'password',
      client_id: 'client-test-id',
      client_secret: 'client-test-secret',
      username: 'user-test-username',
      password: 'user-test-password',
      scope: 'read+write',
    }
    const response = await controller.token({ body })

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
    })
  })
})
