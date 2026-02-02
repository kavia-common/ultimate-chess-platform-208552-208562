// PUBLIC_INTERFACE
export function getApiBaseUrl(): string {
  /** Base URL for REST API calls (optional). */
  return (process.env.REACT_APP_API_BASE_URL ?? "").replace(/\/$/, "");
}

// PUBLIC_INTERFACE
export function getWsUrl(): string {
  /** Base URL for socket.io (optional). */
  const ws = (process.env.REACT_APP_WS_URL ?? "").replace(/\/$/, "");
  return ws || getApiBaseUrl() || window.location.origin;
}
