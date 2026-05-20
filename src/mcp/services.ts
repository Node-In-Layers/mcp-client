import { v4 as uuidv4 } from 'uuid'
import {
  AnnotatedFunctionProps,
  CrossLayerProps,
  ServicesContext,
  createErrorObject,
  LogLevelNames,
  annotatedFunction,
  memoizeValueSync,
  XOR,
} from '@node-in-layers/core'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import axios from 'axios'
import { JsonAble, JsonObj } from 'functional-models'
import {
  ClientConfig,
  McpClientNamespace,
  HttpConnection,
  CliConnection,
} from '../types.js'
import { createOAuth2Manager } from '../common/oauth2.js'
import { McpAuthResolutionResult } from '../common/types.js'

type _TransportAuth = Readonly<{
  key?: string
  header?: string
  formatter?: (key: string) => string
}>

type _TransportFactory = (
  connection: XOR<HttpConnection, CliConnection>,
  auth?: _TransportAuth
) => Promise<Transport>

type _CreateServicesDeps = Readonly<{
  createTransport?: _TransportFactory
  createClient?: (args: Readonly<{ name: string; version: string }>) => Client
}>

export const createHttpTransport = async (
  connection: HttpConnection,
  auth?: _TransportAuth
) => {
  const keyValue =
    auth?.key && auth?.formatter
      ? auth.formatter(auth.key)
      : auth?.key || undefined
  const header = auth?.header ? auth.header : 'Authorization'
  const headers = keyValue
    ? {
        requestInit: {
          headers: {
            [header]: keyValue,
          },
        },
      }
    : {}

  if (connection.type === 'http') {
    return new StreamableHTTPClientTransport(new URL(connection.url), {
      ...headers,
    })
  }
  throw new Error(
    `Unsupported connection type: ${(connection as { type: string }).type}`
  )
}

export const createMcpServices = (
  context: ServicesContext<ClientConfig, object>,
  deps?: _CreateServicesDeps
) => {
  // eslint-disable-next-line functional/no-let
  let mcpClient: Client | undefined = undefined
  // eslint-disable-next-line functional/no-let
  let transport: Transport | undefined = undefined
  // eslint-disable-next-line functional/no-let
  let lastResolvedAuthSignature: string | undefined = undefined
  const createTransport =
    deps?.createTransport ??
    ((connection: XOR<HttpConnection, CliConnection>, auth?: _TransportAuth) =>
      createHttpTransport(connection as HttpConnection, auth))
  const createClient =
    deps?.createClient ??
    (args =>
      new Client({
        name: args.name,
        version: args.version,
      }))

  // Setup OAuth2 manager if configured
  const oauth2Manager = context.config[McpClientNamespace.client].oauth2
    ? createOAuth2Manager(
        context.config[McpClientNamespace.client].oauth2,
        axios
      )
    : undefined

  const _requireAuthResolution = (
    auth: McpAuthResolutionResult | undefined,
    errorMessage: string
  ): _TransportAuth => {
    if (auth === undefined) {
      throw new Error(errorMessage)
    }
    if (typeof auth.key !== 'string' || auth.key.trim().length === 0) {
      throw new Error(
        'mcp-client authAdapter returned invalid auth: key must be a non-empty string'
      )
    }
    return {
      key: auth.key,
      header: auth.header,
      formatter: auth.formatter,
    }
  }

  const _resolveSystemTransportAuth = async (
    _crossLayerProps?: CrossLayerProps
  ): Promise<_TransportAuth | undefined> => {
    const directToken =
      context.config[McpClientNamespace.client].credentials?.key
    if (directToken) {
      return {
        key: directToken,
        header: context.config[McpClientNamespace.client].credentials?.header,
        formatter:
          context.config[McpClientNamespace.client].credentials?.formatter,
      }
    }
    if (oauth2Manager) {
      const accessToken = await oauth2Manager.getAccessToken()
      return {
        key: accessToken,
        header: context.config[McpClientNamespace.client].credentials?.header,
        formatter:
          context.config[McpClientNamespace.client].credentials?.formatter,
      }
    }
    return Promise.resolve({
      key: context.config[McpClientNamespace.client].credentials?.key,
      header: context.config[McpClientNamespace.client].credentials?.header,
      formatter:
        context.config[McpClientNamespace.client].credentials?.formatter,
    })
  }

  const _getTransportAuthResolver = memoizeValueSync(() => {
    const adapterConfig = context.config[McpClientNamespace.client].authAdapter
    if (!adapterConfig) {
      return _resolveSystemTransportAuth
    }
    const domainName = adapterConfig.module || McpClientNamespace.client
    const domainServices = context.services.getServices(domainName)
    if (!domainServices) {
      throw new Error(
        `mcp-client authAdapter services for domain "${domainName}" were not found`
      )
    }
    const authFunctionName = adapterConfig.authFunctionName || 'getAuth'
    const authFunction = domainServices[authFunctionName]
    if (typeof authFunction !== 'function') {
      throw new Error(
        `mcp-client authAdapter function "${authFunctionName}" is missing on services for domain "${domainName}"`
      )
    }

    const resolvedAuthFunction = authFunction as (
      crossLayerProps?: CrossLayerProps
    ) => Promise<McpAuthResolutionResult | undefined>

    return async (crossLayerProps?: CrossLayerProps) => {
      const auth = await Promise.resolve(resolvedAuthFunction(crossLayerProps))
      const authOrFallback =
        (auth as McpAuthResolutionResult | undefined) ??
        adapterConfig.fallbackAuth
      if (authOrFallback === undefined) {
        return {
          key: context.config[McpClientNamespace.client].credentials?.key,
          header: context.config[McpClientNamespace.client].credentials?.header,
          formatter:
            context.config[McpClientNamespace.client].credentials?.formatter,
        }
      }
      const validatedAuth = _requireAuthResolution(
        authOrFallback,
        `mcp-client authAdapter function "${authFunctionName}" returned invalid auth for domain "${domainName}"`
      )
      return {
        key: validatedAuth.key,
        header:
          validatedAuth.header ||
          context.config[McpClientNamespace.client].credentials?.header,
        formatter:
          validatedAuth.formatter ||
          context.config[McpClientNamespace.client].credentials?.formatter,
      }
    }
  })

  const _authSignature = (auth?: _TransportAuth) => {
    const header = auth?.header || 'Authorization'
    const key = auth?.key || '__none__'
    return `${header}:${key}`
  }

  const _connectClient = async (auth?: _TransportAuth) => {
    transport = await createTransport(
      context.config[McpClientNamespace.client].mcp.connection,
      auth
    )
    // eslint-disable-next-line require-atomic-updates
    mcpClient = createClient({
      name: context.config.systemName,
      version: context.config[McpClientNamespace.client].version || '1.0.0',
    })
    await mcpClient.connect(transport)
    lastResolvedAuthSignature = _authSignature(auth)
  }

  // Internal connect logic (not exposed)
  const ensureConnected = async (
    crossLayerProps?: CrossLayerProps
  ): Promise<void> => {
    const resolveTransportAuth = _getTransportAuthResolver()
    const auth = await resolveTransportAuth(crossLayerProps)
    const nextSignature = _authSignature(auth)
    if (!mcpClient) {
      await _connectClient(auth)
      return
    }
    if (lastResolvedAuthSignature !== nextSignature) {
      await mcpClient.close()
      // eslint-disable-next-line require-atomic-updates
      mcpClient = undefined
      transport = undefined
      await _connectClient(auth)
    }
  }

  async function disconnect() {
    if (mcpClient) {
      await mcpClient.close()
      // eslint-disable-next-line require-atomic-updates
      mcpClient = undefined
      transport = undefined
      lastResolvedAuthSignature = undefined
    }
  }

  /**
   * Execute an MCP tool call, handling authentication and connection lifecycle.
   * @param toolName The name of the tool to execute
   * @param input The input parameters for the tool
   */
  async function executeTool<
    TOutput extends JsonAble,
    TInput extends Record<string, JsonAble>,
  >(toolName: string, input: TInput, crossLayerProps?: CrossLayerProps) {
    const log = context.log.getInnerLogger('executeTool', crossLayerProps)
    const id = uuidv4()
    await ensureConnected(crossLayerProps)
    if (!mcpClient) {
      throw new Error('MCP client is not connected (unexpected)')
    }

    const callToolProps = {
      id: id,
      name: toolName,
      input,
      arguments: input,
    }

    log[
      context.config[McpClientNamespace.client].logging?.requestLevel ||
        LogLevelNames.info
    ]('MCP client request', {
      tool: toolName,
      method: 'POST',
      body: callToolProps,
    })

    const response = await mcpClient.callTool(callToolProps).catch(e => {
      const error = createErrorObject('MCP call failed', e)
      log[
        context.config[McpClientNamespace.client].logging?.errorLevel ||
          LogLevelNames.error
      ]('MCP client error', {
        tool: toolName,
        error: error,
      })
      throw e
    })
    // @ts-ignore
    const actualData = JSON.parse(response.content[0].text)

    log[
      context.config[McpClientNamespace.client].logging?.responseLevel ||
        LogLevelNames.info
    ]('MCP client response', {
      tool: toolName,
      response: actualData,
    })

    return actualData as TOutput
  }

  const executeMcpFeature = async <
    TInput extends JsonObj,
    TOutput extends JsonObj | void,
  >(
    annotationProps: AnnotatedFunctionProps<TInput, TOutput>,
    input: TInput,
    crossLayerProps?: CrossLayerProps
  ) => {
    const inputArgs = {
      domain: annotationProps.domain,
      featureName: annotationProps.functionName,
      args: input,
      crossLayerProps,
    }

    return executeTool('execute_feature', inputArgs, crossLayerProps)
  }

  const createMcpFeature = <
    TProps extends JsonObj,
    TOutput extends JsonObj | void,
  >(
    annotationProps: AnnotatedFunctionProps<TProps, TOutput>
  ) => {
    async function _wrapper(input, crossLayerProps) {
      const result = await executeMcpFeature<TProps, TOutput>(
        annotationProps,
        input,
        crossLayerProps
      )
      return result
    }
    return annotatedFunction<TProps, TOutput>(
      annotationProps,
      // @ts-ignore
      _wrapper
    )
  }

  return {
    executeTool,
    disconnect,
    executeMcpFeature,
    createMcpFeature,
  }
}

const create = (context: ServicesContext<ClientConfig, object>) => {
  return createMcpServices(context, {
    createTransport: async (connection, auth) =>
      createHttpTransport(connection as HttpConnection, auth),
  })
}

export { create }
