import { ServicesContext } from '@node-in-layers/core/index.js'
import { createOrm, ModelInstanceFetcher } from 'functional-models'
import { datastoreProvider as restDatastoreProvider } from 'functional-models-orm-mcp'
import { memoizeValueSync } from '@node-in-layers/core/utils.js'
import { McpClientServices, McpClientConfig } from './types.js'
import { McpClientNamespace } from '../types.js'

const create = (): McpClientServices => {
  const getDatastoreProvider = memoizeValueSync(
    (context: ServicesContext<McpClientConfig>) => {
      return restDatastoreProvider(context.config[McpClientNamespace.client].mcp)
    }
  )

  const getModelProps = <
    TModelOverrides extends object = object,
    TModelInstanceOverrides extends object = object,
  >(
    context: ServicesContext
  ) => {
    const myContext = context as ServicesContext<McpClientConfig>

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
