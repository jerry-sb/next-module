---

# 🧩 `@jerry-sb/api-module`

모듈화된 서버 API 핸들링 & 에러 핸들링 유틸 – **Next.js 서버 핸들러 작성의 DX를 극대화**합니다.

---

## 🧠 주요 특징

### ✅ 에러 중심 설계 (Error-first Design)
- 커스텀 `ServerError` 클래스 계층을 통해 각 HTTP 상태 코드에 대응
- **Zod** 기반의 스키마 유효성 검증 실패도 자동 에러 응답으로 전환
- `handleServerError`로 메타 정보를 포함한 일관된 에러 포맷 제공
- `setGlobalErrorHandler`로 프로젝트 전역 커스터마이징 가능

### ✅ `NextRequest` 기반 라우터 모듈 시스템
- `verifyBody`, `verifyParams`, `verifyQuery`, `pagination` 미들웨어 체이닝
- `zod` 스키마로 타입 안전성과 유효성 검사 동시 보장

### ✅ 강력한 테스트 커버리지
- `vitest` 기반 유닛 테스트로 `handler`, `error`, `validation` 등 모든 동작 보장
- Zod의 `parse` 실패, TimeoutError 발생, Global handler 동작 등 테스트 검증 완료

---

## ⚙️ 기술 스택

| 분류          | 기술 / 라이브러리              |
| ------------- | ------------------------------- |
| 언어          | TypeScript                      |
| 런타임        | Node.js (>=18), Next.js 지원    |
| 번들러        | Rollup (ESM & d.ts 출력)       |
| 유효성 검증   | [Zod](https://github.com/colinhacks/zod) |
| 테스트        | [Vitest](https://vitest.dev)    |
| 패키지 관리   | pnpm + turborepo                |
| 코드 스타일    | eslint, prettier, custom config |
| 메시지 관리    | `getMessage()` 유틸 분리        |

---

## 📦 설치

```bash
pnpm add @jerry-sb/api-module
```

---

## 🛠️ 사용 예시

```ts
createClient({
    lang: "kr",
    pagination: {
        pageIndex: "p",
        pageSize: "s",
        sortBy: "sb",
        sortOrder: "so"
    },
    timeout: 5000,
});

// ✅ 핸들러 구성
const handler = getClient<{ message: string }>()
    .verifyBody(z.object({ name: z.string() }))
    .handle(async (req, ctx) => {
        return { message: `hello ${ctx.body.name}` };
    });
```

---

## 🧪 테스트

```bash
pnpm test
```

---

## 📁 구조

```
src/
├── error.ts           // 모든 서버 에러 클래스 및 핸들러 정의
├── handler.ts         // createRouteHandler 및 Middleware 설계
├── client.ts          // 요청 관련 설정 및 Pagination 구성
└── messeage.ts        // 다국어 메시지 유틸
```

---

## 📌 TODO

- [ ] 다국어 메시지 처리기 개선 (`getMessage`)
- [ ] 응답 코드 분류 기반 로깅 확장
- [ ] OpenAPI 스펙 자동 추출?

---

## 🧑‍💻 Maintained by [@심명보](https://github.com/jerry-sb)
