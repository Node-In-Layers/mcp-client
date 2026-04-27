import { assert } from 'chai'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { createTransport as createBackendTransport } from '../../../src/backend/services.js'
import { createHttpTransport } from '../../../src/mcp/services.js'

describe('/src/backend/services.ts', () => {
  describe('#createTransport()', () => {
    it('should create stdio transport for cli connections', async () => {
      const actual = await createBackendTransport({
        type: 'cli',
        path: 'node',
        args: ['-e', 'console.log(1)'],
      })

      assert.instanceOf(actual, StdioClientTransport)
    })
  })
})

describe('/src/mcp/services.ts', () => {
  describe('#createHttpTransport()', () => {
    it('should reject cli connections in frontend-safe mcp transport', async () => {
      let actualError: unknown
      try {
        await createHttpTransport({
          type: 'cli',
          path: 'node',
        } as any)
      } catch (error) {
        actualError = error
      }

      assert.instanceOf(actualError, Error)
      assert.match(
        (actualError as Error).message,
        /Unsupported connection type/
      )
    })
  })
})
