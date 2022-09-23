# OAuth2JS Providers

## Express

```sh
yarn add @oauth2js/express
```

```ts
import Express from 'express'
import oauth2js from '@oauth2js/express'
import { ProofKeyForCodeExchange, AuthorizationCodeGrant } from '@oauth2js/provider'

const app = Express()

app.use(
  oauth2js({
    getTokenByAccessToken: accessToken => {...},
    getRequiredScopesByNames: (requiredScopesNames, allowedScopes) => {...},
  })
    .use(ProofKeyForCodeExchange(AuthorizationCodeGrant))
    .use(RefreshTokenGrant)
    .implement({
      getClientById: async clientId => {...},
      isPublicClient: async client => {...},
      getScopesObjects: async scopes => {...},
      saveAuthorizationCode: async authorizationCode => {...},
      sendAuthorizationCode: async (authorizationCode, context) => {...},
      sendErrorWithInvalidClient: async (error, context) => {...},
      sendErrorWithInvalidRedirectUri: async (error, context) => {...},
      getAuthorizationCodeByCode: async code => {...},
      saveTokenByAuthorizationCode: async (token, authorizationCode) => {...},
      saveTokenByRefreshedToken: async (token, refreshedToken) => {...},
      authorizeAuthorizationCode: async (authorizationCode, user) => {...},
      denyAuthorizationCode: async authorizationCode => {...},
      getUserByAuthorizationCode: async authorizationCode => {...},
      revokeAuthorizationCode: async authorizationCode => {...},
      revokeToken: async token => {...},
      getTokenByRefreshToken: async refreshToken => {...},
    })
)
```

Muita coisa né? Então vamos por parte vou explicar o que está acontecendo ali.

- Criação do servidor de express js
- Criamos uma instância de oauth2js que vem do pacote `@oauth2js/express`
- Passmos um objeto que contém as propriedades:
  - `getTokenByAccessToken`:
    Serve para você encontrar um modelo de token pelo seu **access token**
  - `getRequiredScopesByNames`:
    Basicamente ele quem cuida se o token tem escopo suficiente para seguir com a funcionalidade. Caso você retorne uma quantidade menor do que o solicitado no handler (através do `oauth2js.scope`) o cliente vai receber um erro de escopo insuficiente para a requisição.
- Pedimos para a instância do `oauth2js` utilizar o `ProofKeyForCodeExchange` contendo o `AuthorizationCodeGrant`
  Dentro do `@oauth2js/provider` separamos a extensão **PKCE** do *Authorization Code Grant*, ou seja você, **se quiser**, consegue utilizar o PKCE em outras estruturas de *Exchanger* como por exemplo *Device Code Grant*, então nesse caso estamos dizendo que queremos utilizar o PKCE em um *Exchanger* que é o `AuthorizationCodeGrant`, que é o nosso modelo de *Authorization Code Grant*.
- Pedimos também para que a instância utilize o `RefreshTokenGrant`que será responsável por renovar o nosso token gerado pelo `AuthorizationCodeGrant` quando o mesmo expirar.
- Então implementação, função que são necessárias no `ProofKeyForCodeExchange(AuthorizationCodeGrant)` e `RefreshTokenGrant` elas podem ser compartilhadas ou não, você pode definir em um e não no outro caso você queira, normalmente os nomes são bem intuitivos então só vou descrever mesmo por... sei lá.
  - `getClientById`:
    Pega o modelo de cliente a partir do **id** dele. Esse id está mais para um alias, algo como a junção do nome de uma organização com o do projeto, ex: `facebook:react-project`. Normalmente o id do seu cliente é um uuid, e não é muito comum utilizar isso... eu acho... Mas enfim o que vai ser esse id o críterio é basicamente seu então, faça dele o melhor uso que puder imaginar, apenas retorne o modelo do cliente! Você também pode retornar null, isso significa que não conseguimos encontrar o client por n dos seus motivos e vamos retonar um erro de *invalid client*.

    Origem: `AuthorizationCodeGrant`

  - `isPublicClient`:
    Verifica se o cliente é publico. Isso é basicamente coisinha unica e exclusiva do nosso amiguinho PKCE, no OAuth2 temos 2 tipos de clientes os publicos e os confidenciais, separando rusticamente publicos são front-end's e confidenciais o back-end, no internet você vai encontrar x articos e textos explicando isso então não vou entrar a fundo aqui.

    Origem: `ProofKeyForCodeExchange`

  - `getScopesObjects`:
    Carrega modelos de escopos a partir dos nomes deles, isso foi algo que eu pensei bastante sobre a necessidade, e obviamente por você estar implementado isso agora a minha decisão já está na cara, justificando... algumas vezes você precisa dar um significado "extra programatico", por exemplo a descrição na hora em que o usuário receber uma solicitação para acessar determinado recurso dele.

    Origem: `AuthorizationCodeGrant`

  - `saveAuthorizationCode`:
    Salva o código de authorização...

    Origem: `AuthorizationCodeGrant`

  - `sendAuthorizationCode`:
    Solicita a tela para o usuário, provavelmente essa vai ser uma das poucas vezes que você vai pegar o modelo de contexto que o `oauth2js/provider` oferece. Nesse exemplo do express ele contém uma propriedade chamada `response`que é examente o que o express oferece como segundo parametro de um handler comum. Bem, você precisa renderizar a tela para ele poder confirmar, assim que ele confirma você precisa criar a lógica para consegue chamar o `oauth2js.authorize`, mais para frente vou explicar sobre ele.

    Origem: `AuthorizationCodeGrant`

  - `sendErrorWithInvalidClient` e `sendErrorWithInvalidRedirectUri`:
    Esses dois fazem quase a mesma coisa, mas existêm por motivos diferentes, no oauth2 não podemos retornar um erro pro `redirect_uri` que ele oferece caso:

      - O cliente seja inválido `sendErrorWithInvalidClient`

      - A url de redirecionamento recebida seja diferente da qual o cliente configurou `sendErrorWithInvalidRedirectUri`.
    
    Então por esses motivos você precisa renderizar uma tela de erro informando o cliente sobre isso. Você também recebe um argumento de erro, que você pode fazer um trace e analisar qual erro foi lançado e dentro disso qual outro...

    Origem: `AuthorizationCodeGrant`

  - `getAuthorizationCodeByCode`:
    A partir desse ponto já é para ter pelo menos o modelo de *Authorization Code* salvo em algum lugar... por que vamos precisar dele agora. Apenas carregue o modelo pelo código, caso retorne null, vamos fazer o tratamento de erro.

    Origem: `AuthorizationCodeGrant`

  - `authorizeAuthorizationCode`:

    Autoriza o *Authorization Code* com o usuário recebido. Provavelmente para isso estar acontecendo o usuário confiou no cliente para entregar suas informações, então vamos gerar o token e redirecionar ele para a uri de redirecionamento.

    Origem: `AuthorizationCodeGrant`

  - `denyAuthorizationCode`:

    Por outro lado ele pode negar o acesso. Bem se isso acontecer não vamos gerar o token, mas vamos redirecionar dizendo que ele foi negado...

    Origem: `AuthorizationCodeGrant`

  - `getUserByAuthorizationCode`:

    Pega o usuário que está vinculado ao modelo de *Authorization Code* gerado.

    Origem: `AuthorizationCodeGrant`

  - `saveTokenByAuthorizationCode`:

    Caso tenha authorization... Vamos salvar esse token ou não, depende da sua lógica...

    Origem: `AuthorizationCodeGrant`

  - `revokeAuthorizationCode`:
    
    Bem também temos que revogar o authorization code, afinal não queremos que ele utilize ele novamente... Faça isso!

    Origem: `AuthorizationCodeGrant`

  E com isso finalizamos o fluxo do *Authorization Code Grant*, mas temos o do *Refresh Token Grant* que é bem simples comparado ao anterior:

  - `getTokenByRefreshToken`:

    Carrega o modelo de token pelo `refresh_token` passado.

    Origem: `RefreshToken`

  - `revokeToken`:

    Revoka o token que foi renovado, afinal né, não queremos acreditar que ele é um token valido depois de ter dado o refresh nele... Faça isso!

    Origem: `RefreshToken`

  - `saveTokenByRefreshedToken`:

    Por último... Salva o novo token gerado a partir do que foi renovado.

    Origem: `RefreshToken`

Com tudo isso você já tem um provedor de OAuth2 que suporta `response_type=code`, `grant_type=authorization_code` e `grant_type=refresh_token`. Mas essa bela maravilha de biblioteca não se contenta com isso. Você pode implementar o não tão amado *Resource Owner Password Credentials Grant* e também os não tão amados quanto o *Authorization Code Grant* mas úteis *Client Credentials Grant* e *Device Code Grant*.
