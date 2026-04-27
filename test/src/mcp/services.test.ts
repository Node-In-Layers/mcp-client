import { assert } from 'chai'
import sinon from 'sinon'
import { ServicesContext } from '@node-in-layers/core'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { createMcpServices } from '../../../src/mcp/services.ts'
import { ClientConfig, McpClientNamespace } from '../../../src/types.ts'

const _createContext = (args?: {
  authAdapter?: ClientConfig[typeof McpClientNamespace.client]['authAdapter']
  credentialsKey?: string
  authFunctionResult?: unknown
}) => {
  const getAuth = sinon.stub().resolves(args?.authFunctionResult)
  const getServices = sinon.stub()
  getServices.withArgs('auth-domain').returns({
    getAuth,
  })
  getServices.withArgs(McpClientNamespace.client).returns({})

  return {
    context: {
      config: {
        systemName: 'test-system',
        [McpClientNamespace.client]: {
          domains: [],
          mcp: {
            connection: {
              type: 'http',
              url: 'http://localhost:3000',
            },
          },
          credentials: {
            key: args?.credentialsKey,
          },
          authAdapter: args?.authAdapter,
        },
      },
      services: {
        getServices,
      },
      log: {
        getInnerLogger: () => ({
          trace: () => undefined,
          debug: () => undefined,
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        }),
      },
    } as unknown as ServicesContext<ClientConfig, object>,
    getServices,
    getAuth,
  }
}

describe('/src/mcp/services.ts', () => {
  describe('#createMcpServices()', () => {
    it('should use adapter auth when configured', async () => {
      const setup = _createContext({
        authAdapter: {
          module: 'auth-domain',
          authFunctionName: 'getAuth',
        },
        credentialsKey: 'fallback-token',
        authFunctionResult: {
          key: 'adapter-token',
        },
      })
      const transportStub = sinon.stub().resolves({} as Transport)
      const callTool = sinon.stub().resolves({ content: [{ text: '{}' }] })
      const mcpClient = {
        connect: sinon.stub().resolves(undefined),
        close: sinon.stub().resolves(undefined),
        callTool,
      }
      const createClient = sinon.stub().returns(mcpClient as any)
      const services = createMcpServices(setup.context, {
        createTransport: transportStub,
        createClient,
      })

      await services.executeTool('myTool', { value: 'x' })

      assert.equal(transportStub.callCount, 1)
      assert.equal(transportStub.firstCall.args[1].key, 'adapter-token')
      assert.equal(setup.getServices.callCount, 1)
      assert.equal(setup.getAuth.callCount, 1)
    })

    it('should throw early when adapter auth is missing', async () => {
      const setup = _createContext({
        authAdapter: {
          module: 'auth-domain',
          authFunctionName: 'getAuth',
        },
        authFunctionResult: undefined,
      })
      const services = createMcpServices(setup.context, {
        createTransport: sinon.stub().resolves({} as Transport),
        createClient: sinon.stub().returns({
          connect: sinon.stub().resolves(undefined),
          close: sinon.stub().resolves(undefined),
          callTool: sinon.stub().resolves({ content: [{ text: '{}' }] }),
        } as any),
      })

      let actualError: unknown
      try {
        await services.executeTool('myTool', { value: 'x' })
      } catch (error) {
        actualError = error
      }

      assert.instanceOf(actualError, Error)
      assert.match(
        (actualError as Error).message,
        /returned no auth for domain "auth-domain"/
      )
    })

    it('should fall back to system credentials when adapter is absent', async () => {
      const setup = _createContext({
        credentialsKey: 'system-token',
      })
      const transportStub = sinon.stub().resolves({} as Transport)
      const services = createMcpServices(setup.context, {
        createTransport: transportStub,
        createClient: sinon.stub().returns({
          connect: sinon.stub().resolves(undefined),
          close: sinon.stub().resolves(undefined),
          callTool: sinon.stub().resolves({ content: [{ text: '{}' }] }),
        } as any),
      })

      await services.executeTool('myTool', { value: 'x' })

      assert.equal(transportStub.callCount, 1)
      assert.equal(transportStub.firstCall.args[1].key, 'system-token')
      assert.equal(setup.getServices.callCount, 0)
    })
  })
})
