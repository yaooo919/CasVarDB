const API_BASE_URL = process.env.REACT_APP_API_URL?.trim();

export function buildApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("REACT_APP_API_URL is not configured");
  }

  if (API_BASE_URL.endsWith("/") && path.startsWith("/")) {
    return API_BASE_URL + path.slice(1);
  }

  if (!API_BASE_URL.endsWith("/") && !path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }

  return API_BASE_URL + path;
}
