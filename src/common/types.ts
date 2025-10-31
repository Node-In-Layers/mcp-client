import {
  AnnotatedFunctionProps,
  CrossLayerProps,
  NilAnnotatedFunction,
  NilFunctionReturn,
} from '@node-in-layers/core'
import type { JsonAble, JsonObj } from 'functional-models'
import { McpClientNamespace } from '../types.js'

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
