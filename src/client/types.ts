import { ClientBasicConfig, McpClientNamespace } from '../types.js'

export type ClientFeatures<T extends Record<string, any>> = T

/**
 * The client, which is organized by a number of domains to functions.
 */
export type Client<T extends Record<string, any>> = ClientFeatures<T> & {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export type ClientEntries = Readonly<{
  createClient: <T extends Record<string, any>>(
    config: ClientBasicConfig
  ) => Promise<Client<T>>
}>

export type ClientEntriesLayer = Readonly<{
  [McpClientNamespace.client]: ClientEntries
}>
