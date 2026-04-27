import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ServicesContext, XOR } from '@node-in-layers/core'
import { ClientConfig, HttpConnection, CliConnection } from '../types.js'
import { createHttpTransport, createMcpServices } from '../mcp/services.js'

export const createTransport = async (
  connection: XOR<HttpConnection, CliConnection>,
  auth?: {
    key?: string
    header?: string
    formatter?: (key: string) => string
  }
) => {
  if (connection.type === 'http') {
    return createHttpTransport(connection, auth)
  }
  // In cases where we are in a browser we don't have process, this causes major issues.
  // This is why we do dynamic loading for stdio situations.
  if (connection.type === 'cli') {
    return new StdioClientTransport({
      command: connection.path,
      args: connection.args,
      env: connection.env,
      cwd: connection.cwd,
    })
  }
  throw new Error(
    `Unsupported connection type: ${(connection as { type: string }).type}`
  )
}

const create = (context: ServicesContext<ClientConfig, object>) => {
  return createMcpServices(context, { createTransport })
}

export { create }
