export type ClientFeatures<
  T extends Record<string, any>,
  TServices extends Record<string, any>,
> = T & {
  services: TServices
}

/**
 * The client, which is organized by a number of domains to functions.
 */
export type Client<
  T extends Record<string, any>,
  TServices extends Record<string, any>,
> = ClientFeatures<T, TServices> & {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}
