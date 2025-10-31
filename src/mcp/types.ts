import { McpServices } from '../common/types.js'
import { McpClientNamespace } from '../types.js'

export type McpServicesLayer = Readonly<{
  [McpClientNamespace.mcp]: McpServices
}>
