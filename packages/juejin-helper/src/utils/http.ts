import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import JuejinHelper from "../index";

export function createJuejinApi(juejin: JuejinHelper, config?: AxiosRequestConfig): AxiosInstance {
  const http = axios.create({
    baseURL: "https://api.juejin.cn",
    headers: {
      referer: "https://juejin.cn/",
      origin: "https://juejin.cn"
    },
    ...config
  });

  http.interceptors.request.use(
    function (config) {
      if (!juejin) return config;
      config.headers = Object.assign(config.headers || {}, { cookie: juejin?.getCookie() });

      if ((juejin as JuejinHelper).user) {
        const tokens = (juejin as JuejinHelper).getCookieTokens();
        const divider = config.url && config.url.indexOf("?") === -1 ? "?" : "&";
        config.url = (config.url || "") + `${divider}aid=${tokens.aid}&uuid=${tokens.uuid}`;
      }
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  http.interceptors.response.use(
    function (response) {
      if (response.data.err_no) {
        throw new Error(response.data.err_msg);
      }
      return response.data.data;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  return http;
}