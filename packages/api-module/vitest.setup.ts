import { beforeAll, vi } from "vitest";

// 필요한 경우 전역 설정값 초기화
beforeAll(() => {
   // 예: 환경변수 설정, 전역 클라이언트 초기화 등
   process.env.INTERNAL_SERVER_SECRET_KEY = "test-secret-key";
});

// mock timer나 랜덤 값 고정할 수도 있음
vi.useFakeTimers();

// afterAll(() => {
//   cleanup 코드도 가능
// });
