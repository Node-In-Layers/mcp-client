import { McpClientNamespace } from '../types.js'
import { McpServices } from '../common/types.js'

export type McpBackendServicesLayer = Readonly<{
  [McpClientNamespace.mcp]: McpServices
}>
