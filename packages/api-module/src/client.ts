import { initMessageGetter } from "./messeage";
import { createRouteHandler, RouteHandler } from "./handler";

export type LangType = "kr" | "en";

export interface ClientInstanceOptions {
   hmacKey?: string;
   timeout?: number;
   lang: LangType;
   pagination: {
      pageIndex: string;
      pageSize: string;
      sortBy: string;
      sortOrder: string;
   };
}

const defaultOptions: ClientInstanceOptions = {
   lang: "kr",
   timeout: 10 * 1000,
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

export function getClient<
   TData = any,
   P extends Record<string, string | string[]> = any,
   S = any,
   B = any,
   E = any,
>(): RouteHandler<TData, P, S, B, E> {
   if (!_options) {
      throw new Error("❌ API module client not found.");
   }

   return createRouteHandler<TData, P, S, B, E>(_options);
}
