/**
 * @file auth-strategy.ts
 * @author 심명보
 * @description 인증 전략 패턴 기반 모듈. 다양한 인증 방식 (session, internal 등) 추상 클래스를 상속받아 재정의하여 타입 안전하게 정의 및 실행할 수 있도록 지원합니다.
 * @created 2025-04-22
 */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMessage } from "./messeage";

/**
 * ✅ 유저 확장 가능한 인터페이스
 *
 * 사용법
 * import type { StrategyResultMapExtension } from "@/lib/auth-strategy";
 *
 * declare module "@/lib/auth-strategy" {
 *   interface StrategyResultMapExtension {
 *     custom: { userId: string; permissions: string[] };
 *   }
 * }
 *
 * **/
export interface StrategyResultMapExtension {}

/**
 * `Auth`는 인증 전략에서 사용할 수 있는 키 값입니다.
 * 기본값(session, internal 등)에 더해 사용자 정의 확장 타입도 지원됩니다.
 */
export type Auth =
   | keyof StrategyResultMapExtension
   | "session"
   | "internal"
   | "internal-session";

/**
 * 사용자 인증 전략 실행 결과 타입 정의.
 * 각 전략의 반환 값 타입을 명확히 분기 처리합니다.
 */
export type StrategyResultMap<TSession> = {
   session: { session: TSession };
   internal: undefined;
   "internal-session": { session: TSession | null };
} & StrategyResultMapExtension;

export type StrategyResult<A extends Auth, TSession> = {
   result?: StrategyResultMap<TSession>[A];
   errorResponse?: NextResponse<{ code: number; message: string }>;
};

/* -------------------------------------------------------------------------- */
/*                           ✅ 세션 공급자 (AuthProvider)                     */
/* -------------------------------------------------------------------------- */

/**
 * 세션 공급자 타입 정의
 */
export type AuthProvider<TSession> = (
   req: NextRequest
) => Promise<TSession | null>;

let authProvider: AuthProvider<any> = async () => null;

/**
 * 외부에서 사용할 세션 공급자 등록 함수
 */
export function setAuthProvider<TSession>(fn: AuthProvider<TSession>) {
   authProvider = fn;
}

/**
 * 현재 등록된 세션 공급자 반환
 */
export function getAuthProvider<TSession>(): AuthProvider<TSession> {
   return authProvider;
}

/* -------------------------------------------------------------------------- */
/*                          ✅ 인증 전략 추상 클래스 정의                      */
/* -------------------------------------------------------------------------- */

/**
 * 모든 인증 전략의 기반이 되는 추상 클래스입니다.
 * `run(req)` 메서드를 각 전략별로 구현하여 인증 흐름을 정의할 수 있습니다.
 *
 * @typeParam A - 인증 전략 키 (`Auth`)
 * @typeParam TSession - 세션 객체 타입 (예: `Session`, `User`, 등)
 */
export abstract class BaseAuthStrategy<A extends Auth, TSession = unknown> {
   abstract run(req: NextRequest): Promise<StrategyResult<A, TSession>>;

   /**
    * 현재 등록된 authProvider를 통해 세션 정보를 가져옵니다.
    */
   protected async getSession(req: NextRequest): Promise<TSession | null> {
      const auth = getAuthProvider<TSession>();
      return await auth(req);
   }

   /**
    * 인증 실패 시 공통으로 사용하는 응답 객체 반환
    */
   protected unauthorized(
      message: string
   ): NextResponse<{ code: number; message: string }> {
      return NextResponse.json({ code: 401, message }, { status: 401 });
   }

   protected verifyInternalRequest(req: NextRequest, secret: string): boolean {
      const signature = req.headers.get("x-internal-signature");
      const timestamp = req.headers.get("x-internal-timestamp");
      if (!signature || !timestamp) return false;

      const timeDiff = Math.abs(Date.now() - Number(timestamp));
      if (timeDiff > 30000) return false;

      const expected = createHmac("sha256", secret)
         .update(`${timestamp}:${req.method}:${req.nextUrl.pathname}`)
         .digest("hex");

      return expected === signature;
   }

   protected existInternalHeader(req: NextRequest): boolean {
      const signature = req.headers.get("x-internal-signature");
      const timestamp = req.headers.get("x-internal-timestamp");
      return Boolean(signature && timestamp);
   }
}

/* -------------------------------------------------------------------------- */
/*                             ✅ 기본 전략 구현체들                           */
/* -------------------------------------------------------------------------- */

class SessionStrategy<TSession> extends BaseAuthStrategy<"session", TSession> {
   async run(req: NextRequest): Promise<StrategyResult<"session", TSession>> {
      const session = await this.getSession(req);
      if (!session) {
         return {
            errorResponse: this.unauthorized("UNAUTHORIZED_ERROR"),
         };
      }
      return { result: { session } };
   }
}

class InternalStrategy<TSession> extends BaseAuthStrategy<
   "internal",
   TSession
> {
   async run(req: NextRequest): Promise<StrategyResult<"internal", TSession>> {
      const isValid = this.verifyInternalRequest(
         req,
         process.env.INTERNAL_SERVER_SECRET_KEY!
      );
      if (!isValid) {
         return {
            errorResponse: this.unauthorized(getMessage("SIGNATURE_ERROR")),
         };
      }
      return { result: undefined };
   }
}

class InternalSessionStrategy<TSession> extends BaseAuthStrategy<
   "internal-session",
   TSession
> {
   async run(
      req: NextRequest
   ): Promise<StrategyResult<"internal-session", TSession>> {
      const isInternalCheck = this.existInternalHeader(req);
      if (isInternalCheck) {
         const isValid = this.verifyInternalRequest(
            req,
            process.env.INTERNAL_SERVER_SECRET_KEY!
         );
         if (!isValid) {
            return {
               errorResponse: this.unauthorized(
                  getMessage("UNAUTHORIZED_ERROR")
               ),
            };
         }
      } else {
         const session = await this.getSession(req);
         if (!session) {
            return {
               errorResponse: this.unauthorized(
                  getMessage("UNAUTHORIZED_ERROR")
               ),
            };
         }
         return { result: { session } };
      }
      return {};
   }
}

/* -------------------------------------------------------------------------- */
/*                       ✅ 전략 등록/조회/초기화 유틸                         */
/* -------------------------------------------------------------------------- */

const strategyRegistry = new Map<string, BaseAuthStrategy<any, any>>();

/**
 * strategyRegistry에 사용자 전략을 등록합니다.
 *
 * @param key - 전략 이름 (예: "session", "custom" 등)
 * @param strategy - `BaseAuthStrategy` 구현체
 */
export function registerStrategy<A extends Auth>(
   key: A,
   strategy: BaseAuthStrategy<A, any>
) {
   strategyRegistry.set(key, strategy);
}

/**
 * 등록된 전략을 조회합니다.
 *
 * @param key - 전략 키
 * @returns 해당 키로 등록된 인증 전략 (없으면 undefined)
 */
export function getStrategy<A extends Auth>(
   key: A
): BaseAuthStrategy<A, any> | undefined {
   return strategyRegistry.get(key);
}

export function clearStrategy(): void {
   strategyRegistry.clear();
   strategyRegistry.set("session", new SessionStrategy());
   strategyRegistry.set("internal", new InternalStrategy());
   strategyRegistry.set("internal-session", new InternalSessionStrategy());
}

clearStrategy();
