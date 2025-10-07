import { Config, GetModelPropsFunc } from '@node-in-layers/core'
import { DatastoreProviderConfig } from 'functional-models-orm-mcp/types.js'

type McpClientServices = Readonly<{
  /**
   * A function that gives ModelProps. This is useful for empowering mcp models (functional-models-orm-mcp)
   */
  getModelProps: GetModelPropsFunc
}>

type McpClientServicesLayer = Readonly<{
  '@node-in-layers/mcp-client': McpClientServices
}>

type McpClientFeatures = Readonly<object>

type McpClientFeaturesLayer = Readonly<{
  '@node-in-layers/mcp-client': McpClientFeatures
}>

type McpClientConfig = Config &
  Readonly<{
    '@node-in-layers/mcp-client': DatastoreProviderConfig
  }>

export {
  McpClientServices,
  McpClientServicesLayer,
  McpClientFeatures,
  McpClientFeaturesLayer,
  McpClientConfig,
}
