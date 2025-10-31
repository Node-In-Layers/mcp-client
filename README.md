# MCP Client - Helpful tools for making mcp clients.

This library exists for helping to make simple mcp clients using node-in-layer systems.

## How To Use

The recommended way of using this library is by using the `createClient()` function. This function provides a streamlined sdk client for your features and models. You would put this in your SDK library, and then consume this client code on a frontend, or another backend system.

NOTE: In order to make this library tree shakeable and usable in any environment (backend/frontend), there are TWO mcp domains, that you must choose to import. If you want the ability to use mcp-client functionality on a CLI you must import from "@node-in-layers/mcp-client/backend/index.js" rather than from mcp/index.js.

The following example, you would put in your SDK, and then the instance would be created by the consumer of your backend MCP server. We have set this up so that it could be used from either a Frontend or another Backend system, (such as a CLI).

### Your SDK/Client Library

```typescript
// This has the common use mcp domain
import { * as mcp } from '@node-in-layers/mcp-client/mcp/index.js'
import { createClient as createMcpClient } from '@node-in-layers/mcp-client'
import * as domain1 from '../domain1/index.js'
import * as domain2 from '../domain2/index.js'
import * as domain3 from '../domain3/index.js'
import { YourConfig, YourSystemType } from '../types.ts'

export const create = (context: FeaturesContext<YourConfig>) => {
  const createClient = (props: {
    /**
     * If using a frontend, you likely use OIDC and pass an oauth2 token in here.
     */
    oauth2Token?: string
    /**
     * NOTE: This is only useful for if you want to use your client from a backend, or from the CLI.
     */
    oauth2?: {
      tokenUrl: string
      clientId: string
      clientSecret: string
      scopes: string[]
      extraParams?: Record<string, JsonAble>
    }
  }) => {

    const config = {
      systemName: context.config.systemName,
      environment: context.config.environment,
      domains: [mcp, domain1, domain2, domain3],
      // These configurations can be put into your main config, and configure the MCP client itself.
      mcp: context.config.mcpClient,
      credentials: {
        key: props.oauth2Token,
      },
      oauth2: props.oauth2,
    }
    return createMcpClient<SystemType>(config)
  }

  return {
    createClient,
  }
}
```

### Frontend

Now we are going to show how this client can be consumed from a frontend React component.

#### /src/sdk/services.ts

```typescript
import { CoreNamespace, ServicesContext } from '@node-in-layers/core'
// Import these from your Sdk/Client that you created
import { createClient, YourClient } from 'your-sdk'
// This is your Config type for your frontend.
import { AppConfig } from '../types'

const create = async (context: ServicesContext<AppConfig>) => {
  // Some common pattern of code for handling authentication to the client.
  // When authorization is updated (like logging in) it re-creates the client.
  const isAuthenticated = Boolean(context.config.authUser?.access_token)
  const token = context.config.authUser?.access_token

  const client = await createClient({
    oauth2Token: token,
  })

  return {
    client,
    isAuthenticated,
  }
}
```

#### /src/health/Components/HealthCheckBar.tsx

```tsx
import React from 'react'
import { useNodeInLayersContext } from '../nil/NodeInLayersContext.js'

const HealthCheckBar = () => {
  const [health, setHealth] = React.useState(undefined)
  const nilContext = useNodeInLayersContext()
  const client = nilContext.sdk.services.client

  const _checkHealth = async () => {
    const response = await client.health.checkHealth()
    // Normally we would check for .error here before using.
    setHealth(response.health.status)
  }

  useEffect(() => {
    _checkHealth()
  }, [])

  if (client.isAuthenticated === false) {
    return <span>Unknown</span>
  }

  return <span>{health}</span>
}

export default HealthCheckBar
```

## Get Model Props

This library defines a "getModelProps()" in the services layer, which can be used to provide models the backend that they need. (Using the functional-models-mcp library)

### How To Use

If you are using the provided client, then you don't need to do any configuring. However, if you are NOT using the client, and want to use the Get Model Props directly you need to add the following to to use it you need to add the following to your configuration.

```typescript
// config.base.mts

import { CoreNamespace } from '@node-in-layers/core'
import { McpClientNamespace } from '@node-in-layers/mcp-client'

export default async () => {
  return {
    environment: 'base',
    systemName: 'your-system-name',
    [CoreNamespace.root]: {
      // Set your model factory to the data namespace.
      modelFactory: McpClientNamespace.data,
    },
  }
}
```
