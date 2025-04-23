import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createRouteHandler, PaginationParams } from "../src";
import { NextRequest } from "next/server";
import { ClientInstanceOptions } from "../src";

const mockOptions: ClientInstanceOptions = {
   lang: "kr",
   pagination: {
      pageIndex: "pi",
      pageSize: "ps",
      sortBy: "sb",
      sortOrder: "so",
   },
   timeout: 3000,
};

vi.mock("../src/messeage", () => ({
   getMessage: (key: string) => `MOCKED_MESSAGE: ${key}`,
}));

function createMockRequest(url: string, body?: any) {
   const req = new Request(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : null,
      headers: {
         "Content-Type": "application/json",
      },
   });
   return new NextRequest(req);
}

describe("createRouteHandler", () => {
   it("요청 본문을 파싱하여 context에 주입해야 한다", async () => {
      const schema = z.object({ name: z.string() });

      const handler = createRouteHandler<{ name: string }, { id: string }>(
         mockOptions
      ).verifyBody(schema);

      const result = handler.handle(async (_, ctx) => {
         return { name: ctx.body.name };
      });

      const req = createMockRequest("http://localhost", { name: "jerry" });
      const res = await result(req as any, {
         params: Promise.resolve({ id: "1" }),
      });

      const data = await res.json();
      expect(data).toEqual({
         code: 200,
         message: "success",
         data: { name: "jerry" },
      });
   });

   it("페이지네이션 정보를 context에 주입해야 한다", async () => {
      const handler = createRouteHandler<{ pagination: PaginationParams }, any>(
         mockOptions
      ).pagination();

      const result = handler.handle(async (_, ctx) => {
         return { pagination: ctx.pagination };
      });

      const url = new URL("http://localhost?pi=2&ps=5&sb=name&so=desc");
      const req = new NextRequest(new Request(url));
      const res = await result(req, { params: Promise.resolve({}) });

      const json = await res.json();

      expect(json).toEqual({
         code: 200,
         message: "success",
         data: {
            pagination: {
               pageIndex: 2,
               pageSize: 5,
               skip: 10,
               sortBy: "name",
               sortOrder: "desc",
            },
         },
      });
   });

   it("params를 파싱하여 context에 주입해야 한다", async () => {
      const schema = z.object({ userId: z.string() });

      const handler = createRouteHandler<
         { userId: string },
         { userId: string }
      >(mockOptions).verifyParams(schema);

      const result = handler.handle(async (_, ctx) => {
         return { userId: ctx.params.userId };
      });

      const req = createMockRequest("http://localhost");
      const res = await result(req, {
         params: Promise.resolve({ userId: "123" }),
      });

      const data = await res.json();

      expect(data).toEqual({
         code: 200,
         message: "success",
         data: { userId: "123" },
      });
   });

   it("query string을 파싱하여 context에 주입해야 한다", async () => {
      const schema = z.object({ keyword: z.string() });

      const handler = createRouteHandler<{ keyword: string }, any>(
         mockOptions
      ).verifyQuery(schema);

      const result = handler.handle(async (_, ctx) => {
         return { keyword: ctx.query.keyword };
      });

      const url = new URL("http://localhost?keyword=vitest");
      const req = new NextRequest(new Request(url));
      const res = await result(req, {
         params: Promise.resolve({}),
      });

      const json = await res.json();

      expect(json).toEqual({
         code: 200,
         message: "success",
         data: { keyword: "vitest" },
      });
   });

   it("본문 유효성 검증 실패 시 에러 응답을 반환해야 한다", async () => {
      const schema = z.object({ name: z.string() });
      const handler = createRouteHandler<any, any, z.infer<typeof schema>>(
         mockOptions
      ).verifyBody(schema);

      const result = handler.handle(async () => {
         return { ok: true };
      });

      const badReq = createMockRequest("http://localhost", { invalid: true });

      const res = await result(badReq, {
         params: Promise.resolve({}),
      });

      expect(res.status).toBe(400);
   });

   it("query 유효성 검증 실패 시 400 에러를 반환해야 한다", async () => {
      const schema = z.object({ keyword: z.string().min(5) });

      const handler = createRouteHandler<any, any>(mockOptions).verifyQuery(
         schema
      );

      const url = new URL("http://localhost?keyword=hi"); // 키워드 길이 부족 → 실패
      const req = new NextRequest(new Request(url));
      const result = handler.handle(async () => {
         return { ok: true };
      });

      const res = await result(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toBeDefined();
   });

   it("핸들러 내부 오류 발생 시 500 에러를 반환해야 한다", async () => {
      const handler = createRouteHandler<any, any>(mockOptions);

      const result = handler.handle(async () => {
         throw new Error("Something broke");
      });

      const req = createMockRequest("http://localhost");
      const res = await result(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.message).toBeDefined();
      expect(json.code).toBe(500);
   });
});
