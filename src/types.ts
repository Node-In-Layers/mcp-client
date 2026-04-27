import { Config, App, LogLevelNames } from '@node-in-layers/core'
import type {
  OAuth2Config,
  DatastoreProviderConfig,
} from 'functional-models-orm-mcp'
import type { McpAuthResolutionResult } from './common/types.js'

export type CliConnection = Readonly<{
  type: 'cli'
  path: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}>

export type HttpConnection = Readonly<{
  type: 'http'
  url: string
  headers?: Readonly<Record<string, string>>
  timeout?: number
  retry?: Readonly<{
    attempts: number
    backoff: number
  }>
}>

export enum McpClientNamespace {
  client = '@node-in-layers/mcp-client/client',
  mcp = '@node-in-layers/mcp-client/mcp',
  data = '@node-in-layers/mcp-client/data',
}

export type McpConfig = Readonly<{
  connection: DatastoreProviderConfig['connection']
}>

export type McpAuthAdapterConfig = Readonly<{
  /**
   * Namespace of the loaded domain that provides mcp auth functions.
   * Example: "@node-in-layers/auth/client"
   * If omitted, falls back to the client namespace.
   */
  module?: string
  /**
   * The auth function name on the resolved services.
   * Defaults to getAuth.
   */
  authFunctionName?: string
  /**
   * Optional static fallback if external adapter returns undefined.
   */
  fallbackAuth?: McpAuthResolutionResult
}>

export type McpClientConfig = {
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
  credentials?: DatastoreProviderConfig['credentials'] &
    Readonly<{
      header?: string
      key?: string
      formatter?: (key: string) => string
    }>
  /**
   * If you want the client to manage oauth2 connections, use this.
   */
  oauth2?: OAuth2Config
  /**
   * Optional external auth adapter wiring.
   * If provided, mcp-client will resolve auth from another loaded domain.
   */
  authAdapter?: McpAuthAdapterConfig
}

/**
 * The basic configurations needed for creating the client.
 * The rest of the Node in Layer configs are loaded automatically.
 */
export type ClientBasicConfig = Partial<Config> &
  Readonly<{
    [McpClientNamespace.client]: McpClientConfig
  }>

/**
 * The full configuration for the client.
 */
export type ClientConfig = Config & ClientBasicConfig
