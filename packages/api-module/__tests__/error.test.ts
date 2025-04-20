import { describe, vi, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

import {
   handleServerError,
   NotFoundError,
   InternalServerError,
   setGlobalErrorHandler,
   UnauthorizedError,
   ForbiddenError,
   TimeoutError,
} from "../src/error";

// ✅ mock 메시지 유틸
vi.mock("../src/messeage", () => ({
   getMessage: (key: string) => `MOCKED_MESSAGE: ${key}`,
}));

// ✅ mock 요청 생성기
function createMockRequest(url: string, body?: any) {
   const req = new Request(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : null,
      headers: { "content-type": "application/json" },
   });

   return new NextRequest(req);
}

// ✅ 테스트 초기화
beforeEach(() => {
   // 테스트 간 handler 초기화
   setGlobalErrorHandler(undefined as any);
});

describe("✅ handleServerError 유닛 테스트", () => {
   it("📌 NotFoundError는 code와 message, 메타정보를 포함한 응답을 반환해야 한다", async () => {
      const request = createMockRequest("http://localhost/", {
         id: 123,
         name: "심명보",
      });

      const errorInfo = await handleServerError(new NotFoundError(), request);

      expect(errorInfo).toEqual({
         code: 404,
         message: "MOCKED_MESSAGE: NOT_FOUND_ERROR",
         error: {
            url: "http://localhost/",
            method: "POST",
            body: {
               id: 123,
               name: "심명보",
            },
         },
      });
   });

   it("📌 ZodError가 발생하면 400 코드와 Zod 메시지를 반환해야 한다", async () => {
      const request = createMockRequest("http://localhost/", {
         name: 123, // 잘못된 타입
      });

      const schema = z.object({ name: z.string() });

      try {
         schema.parse({ name: 123 });
      } catch (zodError) {
         const errorInfo = await handleServerError(zodError, request);

         expect(errorInfo.code).toBe(400);
         expect(errorInfo.message).toBe("Expected string, received number");
         expect(errorInfo.error.url).toBe("http://localhost/");
         expect(errorInfo.error.body?.name).toBe(123);
      }
   });

   it("📌 일반 에러 객체는 500 코드와 Unknown 메시지를 반환해야 한다", async () => {
      const req = createMockRequest("http://localhost", { x: 1 });

      const errorInfo = await handleServerError(new Error("뭔가 이상함"), req);

      expect(errorInfo.code).toBe(500);
      expect(errorInfo.message).toBe("MOCKED_MESSAGE: UNKNOWN_ERROR");
      expect(errorInfo.error.url).toBe("http://localhost/");
   });

   it("📌 body가 없는 경우에도 error에는 url, method만 포함된다", async () => {
      const req = new NextRequest(
         new Request("http://localhost", { method: "GET" })
      );
      const errorInfo = await handleServerError(new InternalServerError(), req);

      expect(errorInfo).toEqual({
         code: 500,
         message: "MOCKED_MESSAGE: INTERNAL_ERROR",
         error: {
            url: "http://localhost/",
            method: "GET",
         },
      });
   });

   it("📌 setGlobalErrorHandler로 주입한 핸들러가 정상 동작해야 한다", async () => {
      setGlobalErrorHandler(async (error, req) => {
         return {
            code: 999,
            message: "커스텀 핸들러가 처리함",
            error: { customUrl: req.url },
         };
      });

      const req = createMockRequest("http://localhost/custom", { foo: "bar" });
      const errorInfo = await handleServerError(new Error("💥"), req);

      expect(errorInfo.code).toBe(999);
      expect(errorInfo.message).toBe("커스텀 핸들러가 처리함");
      expect(errorInfo.error).toEqual({ customUrl: "http://localhost/custom" });
   });

   it("📌 UnauthorizedError는 401 코드와 기본 메시지를 반환해야 한다", async () => {
      const req = createMockRequest("http://localhost");
      const errorInfo = await handleServerError(new UnauthorizedError(), req);

      expect(errorInfo.code).toBe(401);
      expect(errorInfo.message).toBe("MOCKED_MESSAGE: UNAUTHORIZED_ERROR");
   });

   it("📌 ForbiddenError는 403 코드와 기본 메시지를 반환해야 한다", async () => {
      const req = createMockRequest("http://localhost");
      const errorInfo = await handleServerError(new ForbiddenError(), req);

      expect(errorInfo.code).toBe(403);
      expect(errorInfo.message).toBe("MOCKED_MESSAGE: FORBIDDEN_ERROR");
   });

   it("📌 TimeoutError는 408 코드와 기본 메시지를 반환해야 한다", async () => {
      const req = createMockRequest("http://localhost");
      const errorInfo = await handleServerError(new TimeoutError(), req);

      expect(errorInfo.code).toBe(408);
      expect(errorInfo.message).toBe("MOCKED_MESSAGE: TIMEOUT_ERROR");
   });

   it("📌 ServerError를 상속한 에러가 커스텀 메시지를 전달받으면 해당 메시지를 사용해야 한다", async () => {
      const req = createMockRequest("http://localhost", { id: 1 });

      const customMessage = "리소스를 찾을 수 없습니다.";
      const errorInfo = await handleServerError(
         new NotFoundError(customMessage),
         req
      );

      expect(errorInfo.code).toBe(404);
      expect(errorInfo.message).toBe(customMessage);
      expect(errorInfo.error.url).toBe("http://localhost/");
   });
});
