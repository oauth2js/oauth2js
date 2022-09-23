import { MockController } from '../../.jest/tools/Controller'
import { Database } from '../../.jest/tools/Database'
import {
  DatabaseClient,
  DatabaseDeviceCode,
  DatabaseScope,
  DatabaseUser,
} from '../../.jest/tools/DatabaseTypes'
import { DeviceCodeGrant } from '../standards/DeviceCodeGrant'

describe('Device Code Grant', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
      controller.use(DeviceCodeGrant).implement({
        getClientByCredentials: credentials =>
          db.clients.findOne<DatabaseClient>(
            client =>
              client.id === credentials.id &&
              client.secret === credentials.secret,
          ),
        getScopesObjects: scopes =>
          db.scopes.find<DatabaseScope>(scope => scopes.includes(scope.alias)),
        saveDeviceCode: deviceCode => db.deviceCodes.insertOne(deviceCode),
        pullingInterval: 5 * 1000,
        verificationUri: 'http://localhost:8443',

        getRequestId: request => request.sessionID,

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
      }),
    )

    let response = await controller.release({
      sessionID: 'testing',
      body: {
        response_type: 'device_code',
        client_id: 'client-test-id',
        client_secret: 'client-test-secret',
        scope: 'read+write',
      },
    })

    const body = JSON.parse(response.body)

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(body).toMatchSnapshot({
      device_code: expect.any(String),
      user_code: expect.any(String),
    })
    expect(db.deviceCodes.count()).toBe(1)
    expect(db.deviceCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
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

    response = await controller.token({
      sessionID: 'testing',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: body.device_code,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(400)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      error: 'authorization_pending',
    })

    response = await controller.token({
      sessionID: 'testing',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: body.device_code,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(400)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      error: 'slow_down',
    })

    jest.setSystemTime(new Date(Date.now() + 5 * 1000))

    response = await controller.token({
      sessionID: 'testing',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: body.device_code,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(400)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      error: 'authorization_pending',
    })

    response = await controller.authorize(
      DeviceCodeGrant,
      db.deviceCodes.findOneOrFail(),
      db.users.findOneOrFail(),
    )

    expect(response.status()).toBe(204)
    expect(response.headers).toMatchSnapshot()
    expect(response.body).toBeUndefined()

    expect(db.deviceCodes.count()).toBe(1)
    expect(db.deviceCodes.findOne()).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
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
      user: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    })

    response = await controller.token({
      sessionID: 'testing',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: body.device_code,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(400)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      error: 'slow_down',
    })

    jest.setSystemTime(new Date(Date.now() + 5 * 1000))

    response = await controller.token({
      sessionID: 'testing',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: body.device_code,
        client_id: 'client-test-id',
      },
    })

    expect(response.status()).toBe(200)
    expect(response.headers).toMatchSnapshot()
    expect(JSON.parse(response.body)).toMatchSnapshot({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    })
    expect(db.deviceCodes.count({ includeDeleted: true })).toBe(1)
    expect(
      db.deviceCodes.findOne(void 0, { includeDeleted: true }),
    ).toMatchSnapshot({
      code: expect.any(String),
      codeExpiresAt: expect.any(Date),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      deletedAt: expect.any(Date),
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
      user: {
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    })
  })
})

declare global {
  namespace OAuth2JS {
    namespace Server {
      interface Request {
        sessionID: string
      }
    }
  }
}
