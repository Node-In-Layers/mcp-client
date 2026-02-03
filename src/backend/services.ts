import { v4 as uuidv4 } from 'uuid'
import { CliConnection, HttpConnection, SseConnection } from '@l4t/mcp-ai'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  AnnotatedFunctionProps,
  CrossLayerProps,
  ServicesContext,
  createErrorObject,
  LogLevelNames,
  annotatedFunction,
} from '@node-in-layers/core'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import axios from 'axios'
import { JsonAble, JsonObj } from 'functional-models'
import { ClientConfig, McpClientNamespace } from '../types.js'
import { createOAuth2Manager } from '../common/oauth2.js'

export const createTransport = async (
  connection: HttpConnection | SseConnection | CliConnection,
  auth?: {
    key?: string
    header?: string
    formatter?: (key: string) => string
  }
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
  if (connection.type === 'sse') {
    return new SSEClientTransport(new URL(connection.url), {
      ...headers,
    })
  }
  // In cases where we are in a browser we don't have process, this causes major issues.
  // This is why we do dynamic loading for stdio situations.
  if (connection.type === 'cli') {
    return new StdioClientTransport({
      command: connection.path,
      args: connection.args,
      env: connection.env,
      cwd: connection.cwd,
    })
  }
  throw new Error(
    `Unsupported connection type: ${(connection as { type: string }).type}`
  )
}

const create = (context: ServicesContext<ClientConfig, object>) => {
  // eslint-disable-next-line functional/no-let
  let mcpClient: Client | undefined = undefined
  // eslint-disable-next-line functional/no-let
  let transport: Transport | undefined = undefined
  // eslint-disable-next-line functional/no-let
  let lastAccessToken: string | undefined = undefined

  // Setup OAuth2 manager if configured
  const oauth2Manager = context.config[McpClientNamespace.client].oauth2
    ? createOAuth2Manager(
        context.config[McpClientNamespace.client].oauth2,
        axios
      )
    : undefined

  // Internal connect logic (not exposed)
  const ensureConnected = async (): Promise<void> => {
    // If an oauthToken is provided directly (frontend scenario), use it and skip oauth2Manager
    const directToken =
      context.config[McpClientNamespace.client].credentials?.key
    if (directToken) {
      if (!mcpClient) {
        transport = await createTransport(
          context.config[McpClientNamespace.client].mcp.connection as
            | HttpConnection
            | SseConnection
            | CliConnection,
          {
            header:
              context.config[McpClientNamespace.client].credentials?.header,
            formatter:
              context.config[McpClientNamespace.client].credentials?.formatter,
            key: directToken,
          }
        )
        mcpClient = new Client({
          name: context.config.systemName,
          version: context.config[McpClientNamespace.client].version || '1.0.0',
        })
        await mcpClient.connect(transport)
      }
      return
    }
    // If using OAuth2 manager (backend scenario)
    if (oauth2Manager) {
      const accessToken = await oauth2Manager.getAccessToken()
      if (!mcpClient || lastAccessToken !== accessToken) {
        if (mcpClient) {
          await mcpClient.close()
          // eslint-disable-next-line require-atomic-updates
          mcpClient = undefined
          transport = undefined
        }
        transport = await createTransport(
          context.config[McpClientNamespace.client].mcp.connection as
            | HttpConnection
            | SseConnection
            | CliConnection,
          {
            header:
              context.config[McpClientNamespace.client].credentials?.header,
            formatter:
              context.config[McpClientNamespace.client].credentials?.formatter,
            key: accessToken,
          }
        )
        // eslint-disable-next-line require-atomic-updates
        mcpClient = new Client({
          name: context.config.systemName,
          version: context.config[McpClientNamespace.client].version || '1.0.0',
        })
        await mcpClient.connect(transport)
        // eslint-disable-next-line require-atomic-updates
        lastAccessToken = accessToken
      }
      return
    }
    // API key or no auth: connect if not already
    if (!mcpClient) {
      transport = await createTransport(
        context.config[McpClientNamespace.client].mcp.connection as
          | HttpConnection
          | SseConnection
          | CliConnection,
        {
          header: context.config[McpClientNamespace.client].credentials?.header,
          formatter:
            context.config[McpClientNamespace.client].credentials?.formatter,
          key: context.config[McpClientNamespace.client].credentials?.key,
        }
      )
      mcpClient = new Client({
        name: context.config.systemName,
        version: context.config[McpClientNamespace.client].version || '1.0.0',
      })
      await mcpClient.connect(transport)
    }
  }

  async function disconnect() {
    if (mcpClient) {
      await mcpClient.close()
      // eslint-disable-next-line require-atomic-updates
      mcpClient = undefined
      transport = undefined
      lastAccessToken = undefined
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
    await ensureConnected()
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

export { create }
