/**
 * @file handler.ts
 * @author 심명보 (https://github.com/jerry-sb)
 * @description Next.js App Router를 위한 타입 안전한 Route 핸들러 빌더
 * @created 2025-04-22
 *
 * 이 모듈은 미들웨어 체이닝과 Zod 기반의 유효성 검사를 지원하며,
 * 서버 핸들러를 선언적으로 정의할 수 있게 도와줍니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleServerError } from "./error";
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

   /**
    * 요청의 body를 zod 스키마로 검증하는 미들웨어를 등록합니다.
    * 이 미들웨어를 사용하면 `context.body`에 검증된 데이터를 안전하게 사용할 수 있습니다.
    *
    * @param schema - zod 스키마 객체
    * @returns 새로운 RouteHandler 인스턴스
    */
   verifyBody: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, P, S, B & { body: z.infer<Schema> }, E>;

   /**
    * 동적 라우트의 params를 zod 스키마로 검증하는 미들웨어를 등록합니다.
    * 이 미들웨어를 사용하면 `context.params`에 타입 안전한 params가 주입됩니다.
    *
    * @param schema - zod 스키마 객체
    * @returns 새로운 RouteHandler 인스턴스
    */
   verifyParams: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, z.infer<Schema>, S, B, E>;

   /**
    * 쿼리 파라미터를 zod 스키마로 검증하는 미들웨어를 등록합니다.
    * 이 미들웨어를 사용하면 `context.query`를 통해 안전하게 사용할 수 있습니다.
    *
    * @param schema - zod 스키마 객체
    * @returns 새로운 RouteHandler 인스턴스
    */
   verifyQuery: <Schema extends z.ZodType<any, any>>(
      schema: Schema
   ) => RouteHandler<TData, P, S, B, E & { query: z.infer<Schema> }>;

   /**
    * 페이지네이션 관련 쿼리 파라미터(`pageIndex`, `pageSize`, `sortBy`, `sortOrder`)를 자동으로 처리하는 미들웨어를 등록합니다.
    * 해당 값은 `context.pagination`으로 전달됩니다.
    *
    * @returns 새로운 RouteHandler 인스턴스
    */
   pagination: () => RouteHandler<
      TData,
      P,
      S,
      B,
      E & { pagination: PaginationParams }
   >;

   /**
    * 요청을 최종 처리하는 handler 함수를 정의합니다.
    * 등록된 모든 미들웨어를 순차적으로 실행하고, 마지막에 해당 handler가 실행됩니다.
    *
    * @param handler - 최종 핸들러 함수
    * @returns Next.js App Router용 핸들러 함수
    */
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
