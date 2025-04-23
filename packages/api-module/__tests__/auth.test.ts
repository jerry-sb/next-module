import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
   registerStrategy,
   getStrategy,
   BaseAuthStrategy,
   StrategyResult,
   clearStrategy,
   setAuthProvider,
   getAuthProvider,
} from "../src/auth";

declare module "../src/auth" {
   interface StrategyResultMapExtension {
      custom: { userId: string; permissions: string[] };
   }
}

// ✅ 테스트용 세션 객체 정의
class DummySession {
   email = "test@example.com";
}

// ✅ NextRequest를 mock하기 위한 함수
const createMockRequest = (headers: Record<string, string>) => {
   return new NextRequest("http://localhost/api", { headers });
};

// ✅ 사용자 정의 전략 예제
class DummyStrategy extends BaseAuthStrategy<"custom"> {
   async run(): Promise<StrategyResult<"custom", never>> {
      return {
         result: { userId: "123", permissions: ["read"] },
      };
   }
}

vi.mock("../src/messeage", () => ({
   getMessage: (key: string) => `MOCKED_MESSAGE: ${key}`,
}));

// ✅ 테스트 시작
describe("Auth 전략 모듈 테스트", () => {
   // 각 테스트 전에 초기화
   beforeEach(() => {
      setAuthProvider(() => Promise.resolve(new DummySession()));
      clearStrategy();
   });

   it("사용자 정의 전략 등록 및 조회", async () => {
      const custom = new DummyStrategy();
      registerStrategy("custom", custom); // 전략 등록

      const strategy = getStrategy("custom"); // 전략 조회
      expect(strategy).toBeDefined(); // 존재하는지 확인
      expect(strategy).toBe(custom); // 동일 객체인지 확인
   });

   it("사용자 정의 전략 실행 시 결과 반환 확인", async () => {
      const strategy = new DummyStrategy();
      const res = await strategy.run();
      expect(res.result).toEqual({ userId: "123", permissions: ["read"] });
   });

   it("기본 authProvider는 null 반환", async () => {
      setAuthProvider(() => Promise.resolve(null)); // 기본값 설정
      const auth = getAuthProvider<DummySession>();
      const session = await auth(createMockRequest({}));
      expect(session).toBeNull(); // null 반환 확인
   });

   it("사용자 정의 authProvider에서 세션 반환", async () => {
      setAuthProvider(() => Promise.resolve(new DummySession()));
      const auth = getAuthProvider<DummySession>();
      const session = await auth(createMockRequest({}));
      expect(session?.email).toBe("test@example.com");
   });

   it("세션이 없는 경우 SessionStrategy에서 401 반환", async () => {
      setAuthProvider(() => Promise.resolve(null));
      const strategy = getStrategy("session");
      const result = await strategy.run(createMockRequest({}));
      expect(result.errorResponse?.status).toBe(401); // 권한 없음 응답 확인
   });

   it("세션이 있는 경우 SessionStrategy에서 정상 동작", async () => {
      setAuthProvider(() => Promise.resolve(new DummySession()));
      const strategy = getStrategy("session");
      const result = await strategy.run(createMockRequest({}));
      expect(result.result?.session).toBeInstanceOf(DummySession);
   });

   it("내부 요청이지만 잘못된 시그니처일 경우 401 반환", async () => {
      const req = createMockRequest({
         "x-internal-signature": "valid",
         "x-internal-timestamp": `${Date.now()}`,
      });

      // 환경변수 mocking
      vi.stubEnv("INTERNAL_SERVER_SECRET_KEY", "test-secret");
      const strategy = getStrategy("internal-session");
      const result = await strategy.run(req);
      expect(result.errorResponse?.status).toBe(401); // 시그니처 불일치로 권한 없음
   });
});
