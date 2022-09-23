import { ServerError } from '../errors/ServerError'
import { AbstractConstructorOf, Maybe } from '../helpers/types'
import { IClient } from '../interfaces/IClient'
import { Context } from '../models/Context'
import { UseClient } from './UseClient'

export function UseClientWithRedirectUris<
  T extends AbstractConstructorOf<UseClient>,
>(UseClientClass: T) {
  abstract class UseClientWithRedirectUris extends UseClientClass {
    protected override assertClient(
      client: Maybe<IClient & { redirectUris?: string[] }>,
      context: Context,
    ): asserts client is IClient {
      super.assertClient(client, context)

      if (!client.redirectUris)
        throw new ServerError(
          "The client needs to contain a 'redirectUris' property that has redirect uris allowed.",
          context,
        )

      if (!Array.isArray(client.redirectUris))
        throw new ServerError(
          "The 'redirectUris' property of the client must be an Array instance.",
          context,
        )

      if (!client.redirectUris.length)
        throw new ServerError(
          'The client must contain at least 1 redirect uri.',
          context,
        )

      if (
        !client.redirectUris.every(
          redirectUri => typeof redirectUri === 'string',
        )
      )
        throw new ServerError(
          'All items within the redirect uri list on the client must be of type string',
          context,
        )
    }

    protected async getClientDefaultRedirectUri(
      context: Context,
    ): Promise<string> {
      const redirectUris = await this.getClientRedirectUris(context)

      const defaultRedirectUri = redirectUris[0]

      if (!defaultRedirectUri)
        throw new ServerError(
          'The client must contain at least 1 redirect uri.',
          context,
        )

      return defaultRedirectUri
    }

    protected async getClientRedirectUris(context: Context): Promise<string[]> {
      const client = (await this.getOrLoadClient(context)) as IClient & {
        redirectUris: string[]
      }

      return client.redirectUris
    }

    protected getClientRedirectUrisSync(context: Context): string[] {
      const client = this.getClientSync(context) as IClient & {
        redirectUris: string[]
      }

      return client.redirectUris
    }
  }

  return UseClientWithRedirectUris
}
