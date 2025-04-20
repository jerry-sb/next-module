import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleServerError, TimeoutError } from "./error";
import { ClientInstanceOptions } from "./client";

export type Response<T> = NextResponse<{
   code: number;
   message: string;
   data?: T;
}>;

export type PaginationParams = {
   pageIndex: number;
   pageSize: number;
   skip: number;
   sortBy: string;
   sortOrder: "asc" | "desc";
};

export type BaseContext<PARAM, SESSION, BODY, EXTRA> = {
   params: PARAM;
} & BODY &
   SESSION &
   EXTRA;

export type Middleware<TData, P, S, B, E> = (
   request: NextRequest,
   context: BaseContext<P, S, B, E>,
   next: (
      request: NextRequest,
      context: BaseContext<P, S, B, E>
   ) => Promise<Response<TData>>
) => Promise<Response<TData> | void>;

export interface RouteHandler<TData, P, S, B, E> {
   middlewares: Middleware<TData, P, S, B, E>[];

   verifyBody: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, P, S, B & { body: z.infer<Schema> }, E>;

   verifyParams: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, z.infer<Schema>, S, B, E>;

   verifyQuery: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, P, S, B, E & { query: z.infer<Schema> }>;

   pagination: () => RouteHandler<
      TData,
      P,
      S,
      B,
      E & { pagination: PaginationParams }
   >;

   handle: (
      handler: (
         req: NextRequest,
         context: BaseContext<P, S, B, E>
      ) => Promise<TData>
   ) => (
      req: NextRequest,
      context: { params: Promise<P> }
   ) => Promise<Response<TData>>;
}

function createRouteHandler<
   TData,
   P extends Record<string, string | string[]>,
   S = unknown,
   B = unknown,
   E = unknown,
>(
   options: ClientInstanceOptions,
   middlewares: Middleware<TData, any, any, any, any>[] = []
): RouteHandler<TData, P, S, B, E> {
   return {
      middlewares,

      verifyBody<Schema extends z.ZodType<any, any>>(schema: Schema) {
         const mw: Middleware<TData, P, S, B, E> = async (
            req,
            context,
            next
         ) => {
            const jsonData = await req.json();
            const validationResult = schema.parse(jsonData);
            return next(req, { ...context, body: validationResult });
         };

         return createRouteHandler<
            TData,
            P,
            S,
            B & { body: z.infer<Schema> },
            E
         >(options, [...middlewares, mw]);
      },

      verifyParams<Schema extends z.ZodType<any, any>>(schema: Schema) {
         const mw: Middleware<TData, z.infer<Schema>, S, B, E> = async (
            req,
            context,
            next
         ) => {
            const parsed = schema.parse(context.params);
            return next(req, { ...context, params: parsed });
         };

         return createRouteHandler<TData, z.infer<Schema>, S, B, E>(options, [
            ...middlewares,
            mw,
         ]);
      },

      verifyQuery<Schema extends z.ZodType<any, any>>(schema: Schema) {
         const mw: Middleware<
            TData,
            P,
            S,
            B,
            E & { query: z.infer<Schema> }
         > = async (req, context, next) => {
            const rawQuery = Object.fromEntries(
               req.nextUrl.searchParams.entries()
            );
            const parsedQuery = schema.parse(rawQuery);
            return next(req, { ...context, query: parsedQuery });
         };

         return createRouteHandler<
            TData,
            P,
            S,
            B,
            E & { query: z.infer<Schema> }
         >(options, [...middlewares, mw]);
      },

      pagination() {
         const config = options.pagination;

         const mw: Middleware<TData, P, S, B, E> = async (
            req,
            context,
            next
         ) => {
            const searchParams = req.nextUrl.searchParams;

            const pageIndex = Number(searchParams.get(config.pageIndex)) || 0;
            const pageSize = Number(searchParams.get(config.pageSize)) || 10;
            const skip = pageIndex * pageSize;

            const sortBy = searchParams.get(config.sortBy) || "createdAt";
            const sortOrder =
               searchParams.get(config.sortOrder) === "desc" ? "desc" : "asc";

            const pagination: PaginationParams = {
               pageIndex,
               pageSize,
               skip,
               sortBy,
               sortOrder,
            };

            return next(req, { ...context, pagination });
         };

         return createRouteHandler<
            TData,
            P,
            S,
            B,
            E & { pagination: PaginationParams }
         >(options, [...middlewares, mw]);
      },

      handle(
         handlerFn: (
            req: NextRequest,
            context: BaseContext<P, S, B, E>
         ) => Promise<TData>
      ) {
         return async (
            req: NextRequest,
            context: { params: Promise<P> }
         ): Promise<Response<TData>> => {
            let index = 0;
            const resolvedParams = await context.params;

            const next = async (
               req: NextRequest,
               ctx: BaseContext<P, S, B, E>
            ): Promise<Response<TData>> => {
               try {
                  if (index < middlewares.length) {
                     const middleware = middlewares[index++];
                     const response = await middleware?.(req, ctx, next);
                     if (response instanceof NextResponse) return response;
                  }

                  return NextResponse.json({
                     code: 200,
                     message: "success",
                     data: await handlerFn(req, ctx),
                  });
               } catch (err) {
                  const errorObj = await handleServerError(err, req);

                  return NextResponse.json(errorObj, {
                     status: errorObj.code,
                  });
               }
            };

            return next(req, {
               params: resolvedParams,
            } as BaseContext<P, S, B, E>);
         };
      },
   };
}

export { createRouteHandler };
