const inFlightRequests = new Map<string, Promise<unknown>>();

export function reuseInFlightRequest<T>(key: string, createRequest: () => Promise<T>) {
  const existingRequest = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existingRequest) return existingRequest;

  const request = createRequest().finally(() => {
    if (inFlightRequests.get(key) === request) {
      inFlightRequests.delete(key);
    }
  });
  inFlightRequests.set(key, request);
  return request;
}
