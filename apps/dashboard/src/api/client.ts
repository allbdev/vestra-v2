import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

type TokenGetter = () => string | null;
type TokenSetter = (token: string | null) => void;
type LogoutHook = () => void;

let getAccessToken: TokenGetter = () => null;
let setAccessToken: TokenSetter = () => {};
let onForcedLogout: LogoutHook = () => {};

export function wireAuth(opts: {
  getAccessToken: TokenGetter;
  setAccessToken: TokenSetter;
  onForcedLogout: LogoutHook;
}) {
  getAccessToken = opts.getAccessToken;
  setAccessToken = opts.setAccessToken;
  onForcedLogout = opts.onForcedLogout;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface RefreshedConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ accessToken: string }>(
        "/auth/refresh",
        {},
        { _retried: true } as RefreshedConfig,
      )
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        onForcedLogout();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RefreshedConfig | undefined;
    const status = error.response?.status;
    if (status !== 401 || !original || original._retried) {
      throw error;
    }
    // Don't loop on the refresh call itself.
    if (original.url?.includes("/auth/refresh")) {
      onForcedLogout();
      throw error;
    }
    original._retried = true;
    const next = await refreshAccessToken();
    if (!next) throw error;
    return api.request(original);
  },
);
