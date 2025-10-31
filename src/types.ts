import { CliConnection, HttpConnection, SseConnection } from '@l4t/mcp-ai'
import { Config, App, LogLevelNames } from '@node-in-layers/core'
import type { OAuth2Config } from 'functional-models-orm-mcp'

export enum McpClientNamespace {
  client = '@node-in-layers/mcp-client/client',
  mcpBackend = '@node-in-layers/mcp-client/mcp-backend',
  mcpFrontend = '@node-in-layers/mcp-client/mcp-frontend',
  data = '@node-in-layers/mcp-client/data',
}

export type McpConfig = Readonly<{
  connection: HttpConnection | SseConnection | CliConnection
}>

/**
 * The basic configurations needed for creating the client.
 * The rest of the Node in Layer configs are loaded automatically.
 */
export type ClientBasicConfig = Partial<Config> &
  Readonly<{
    /**
     * A name to be used with the MCP client.
     */
    name: string
    /**
     * The enviornment the client is running in.
     */
    environment: string
    /**
     * The client specific configurations.
     */
    [McpClientNamespace.client]: {
      /**
       * The domains to be loaded, in their order.
       */
      domains: readonly App[]
      /**
       * Configurations for the MCP Server that is being connected to.
       */
      mcp: McpConfig
      /**
       * A version for the "mcp" client. Not required.
       */
      version?: string
      /**
       * Additional options for getting callback
       */
      logging?: {
        /**
         * The log level for requests.
         */
        requestLevel?: LogLevelNames
        /**
         * The log level for responses.
         */
        responseLevel?: LogLevelNames
        /**
         * The log level for errors.
         */
        errorLevel?: LogLevelNames
      }
      /**
       * If you want to provide credentials directly to the client, use this.
       */
      credentials?: {
        /**
         * The header key to use for the authorization token. Defaults to 'Authorization'.
         */
        header?: string
        /**
         * The authorization token or api key
         */
        key?: string
        /**
         * Formats the key authorization key. Defaults to `Bearer ${key}`
         */
        formatter?: (key: string) => string
      }
      /**
       * If you want the client to manage oauth2 connections, use this.
       */
      oauth2?: OAuth2Config
    }
  }>

/**
 * The full configuration for the client.
 */
export type ClientConfig = Config & ClientBasicConfig
