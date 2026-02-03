import {
  GetModelPropsFunc,
  ServicesContext,
} from '@node-in-layers/core/index.js'
import { createOrm, ModelInstanceFetcher } from 'functional-models'
import {
  datastoreProvider as restDatastoreProvider,
  DatastoreProviderConfig,
} from 'functional-models-orm-mcp'
import { memoizeValueSync } from '@node-in-layers/core/utils.js'
import { McpClientServices } from './types.js'
import { McpClientNamespace, McpClientConfig, ClientConfig } from '../types.js'

const _getDatastoreProviderConfig = (
  config: McpClientConfig
): DatastoreProviderConfig => {
  const datastoreConfig: DatastoreProviderConfig = {
    connection: config.mcp.connection,
    credentials: config.credentials,
    oauth2: config.oauth2,
  }
  return datastoreConfig
}

const create = (): McpClientServices => {
  const getDatastoreProvider = memoizeValueSync(
    (context: ServicesContext<ClientConfig>) => {
      const config: DatastoreProviderConfig = _getDatastoreProviderConfig(
        context.config[McpClientNamespace.client]
      )
      return restDatastoreProvider(config)
    }
  )

  const getModelProps: GetModelPropsFunc = <
    TModelOverrides extends object = object,
    TModelInstanceOverrides extends object = object,
  >(
    context: ServicesContext
  ) => {
    const myContext = context as ServicesContext<ClientConfig>
    const datastoreProvider = getDatastoreProvider(myContext)

    const orm = createOrm({
      datastoreAdapter: datastoreProvider,
    })

    return {
      Model: orm.Model,
      fetcher: orm.fetcher as ModelInstanceFetcher<
        TModelOverrides,
        TModelInstanceOverrides
      >,
    }
  }
  return {
    getModelProps,
  }
}

export { create }
