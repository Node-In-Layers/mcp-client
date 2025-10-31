import { McpServices } from '../common/types.js'
import { McpClientNamespace } from '../types.js'

export type McpFrontendServicesLayer = Readonly<{
  [McpClientNamespace.mcpFrontend]: McpServices
}>
