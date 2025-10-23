import { Config, GetModelPropsFunc } from '@node-in-layers/core'
import { DatastoreProviderConfig } from 'functional-models-orm-mcp/types.js'
import { McpClientNamespace } from '../types.js'

type McpClientServices = Readonly<{
  /**
   * A function that gives ModelProps. This is useful for empowering mcp models (functional-models-orm-mcp)
   */
  getModelProps: GetModelPropsFunc
}>

type McpClientServicesLayer = Readonly<{
  [McpClientNamespace.data]: McpClientServices
}>

type McpClientFeatures = Readonly<object>

type McpClientFeaturesLayer = Readonly<{
  [McpClientNamespace.client]: McpClientFeatures
}>

type McpClientConfig = Config &
  Readonly<{
    [McpClientNamespace.data]: DatastoreProviderConfig
  }>

export {
  McpClientServices,
  McpClientServicesLayer,
  McpClientFeatures,
  McpClientFeaturesLayer,
  McpClientConfig,
}
