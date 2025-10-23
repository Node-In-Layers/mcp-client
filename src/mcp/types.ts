import type { HttpConnection, SseConnection, CliConnection } from '@l4t/mcp-ai'
import {
  AnnotatedFunctionProps,
  CrossLayerProps,
  NilAnnotatedFunction,
  NilFunctionReturn,
} from '@node-in-layers/core'
import type { JsonAble, JsonObj } from 'functional-models'
import { McpClientNamespace } from '../types.js'
// Types for MCP tool metadata
// NOTE: We override outputSchema to allow nested objects for output schemas, not just OpenAPISchema.

export enum HttpMethod {
  get = 'get',
  post = 'post',
  put = 'put',
  delete = 'delete',
  patch = 'patch',
}

export type HttpClientInputs = {
  method: HttpMethod
  url: string
  data?: object
  headers?: object
}

export type HttpClient = <T>(inputs: HttpClientInputs) => Promise<T>

export type OAuth2Manager = {
  getAccessToken: () => Promise<string>
  handle401AndRetry: <T>(fn: () => Promise<T>) => Promise<T>
}

export type McpConfig = Readonly<{
  connection: HttpConnection | SseConnection | CliConnection
}>

export type McpServices = Readonly<{
  disconnect: () => Promise<void>
  executeMcpFeature: <TInput extends JsonObj, TOutput extends JsonObj | void>(
    annotationProps: AnnotatedFunctionProps<TInput, TOutput>,
    input: TInput,
    crossLayerProps?: CrossLayerProps
  ) => NilFunctionReturn<TOutput>
  executeTool: <
    TOutput extends JsonAble | void = JsonAble,
    TInput extends Record<string, JsonAble> = Record<string, JsonAble>,
  >(
    toolName: string,
    input: TInput,
    id?: string,
    crossLayerProps?: CrossLayerProps
  ) => Promise<TOutput>
  createMcpFeature: <TProps extends JsonObj, TOutput extends JsonObj | void>(
    annotationProps: AnnotatedFunctionProps<TProps, TOutput>
  ) => NilAnnotatedFunction<TProps, TOutput>
}>

export type McpServicesLayer = Readonly<{
  [McpClientNamespace.mcp]: McpServices
}>
