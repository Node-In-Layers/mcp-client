import merge from 'lodash/merge.js'
import omit from 'lodash/omit.js'
import {
  CoreNamespace,
  loadSystem as loadCoreSystem,
  LogFormat,
  LogLevelNames,
} from '@node-in-layers/core'
import type { ClientBasicConfig, ClientConfig } from '../types.js'
import { McpClientNamespace } from '../types.js'
import type { Client } from './types.js'

/**
 * Creates a client, which loads the node-in-layers client/sdk, and returns only the features portion.
 * @param param0
 * @returns The features of the node in layers client/sdk.
 */
export const createClient = async <T extends Record<string, any>>({
  config,
}: {
  config: ClientBasicConfig
}): Promise<Client<T>> => {
  const theConfig = merge(
    {
      [CoreNamespace.root]: {
        apps: config.domains,
        logging: {
          logLevel: LogLevelNames.info,
          logFormat: LogFormat.json,
          ignoreLayerFunctions: {
            [McpClientNamespace.client]: true,
            [McpClientNamespace.data]: true,
            [`${McpClientNamespace.mcp}.services.createMcpFeature`]: true,
          },
        },
        layerOrder: ['services', 'features', 'mcp'],
        modelFactory: McpClientNamespace.data,
        modelCruds: true,
      },
    },
    omit(config, ['domains', 'logging'])
  ) as unknown as ClientConfig

  const system = await loadCoreSystem({
    environment: theConfig.environment,
    config: theConfig,
  })
  return system.features as Client<T>
}
