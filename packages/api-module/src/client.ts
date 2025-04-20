import "server-only";
import { initMessageGetter } from "./messeage";

export type LangType = "kr" | "en";

export interface ClientInstanceOptions {
   hmacKey?: string;
   lang: "kr" | "en";
   pagination: {
      pageIndex: string;
      pageSize: string;
      sortBy: string;
      sortOrder: string;
   };
}

const defaultOptions: ClientInstanceOptions = {
   lang: "kr",
   pagination: {
      pageIndex: "pageIndex",
      pageSize: "pageSize",
      sortBy: "sortBy",
      sortOrder: "sortOrder",
   },
};

let _options: ClientInstanceOptions | null = null;

export function createClient(options: ClientInstanceOptions) {
   _options = { ...defaultOptions, ...options };
   initMessageGetter(_options.lang);
}

export function getOptions(): ClientInstanceOptions {
   if (!_options) throw new Error("❌ API module client not found.");
   return _options;
}

// export function getClient<
//    T = any,
//    P = any,
//    S = any,
//    B = any,
//    E = any,
// >(): RouteHandler<T, P, S, B, E> {
//    if (!_options) {
//       throw new Error("❌ API module client not found.");
//    }
//
//    return createRouteHandler<T, P, S, B, E>(_options); // 초기 설정을 route-handler로 전달
// }
