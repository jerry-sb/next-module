import { describe, it, beforeEach, expect } from "vitest";
import {
   getMessage,
   initMessageGetter,
   resetMessageGetter,
} from "../src/messeage";
import { createClient } from "../src/client";

describe("message module tests", () => {
   beforeEach(() => {
      // 테스트마다 모듈 리셋해서 _getMessage 초기화 상태로 만들어줌
      // 그러나 이미 import된 것에 대해서는 처리가 안됌 해당
      // 이걸로 초기화하려면 로직을 vi.resetModules() + require() esm이 아닌 commonJS 스타일로 해야한다
      // vi.resetModules();
      //아예 리셋함수를 만들어버리자
      resetMessageGetter();
   });

   it("'kr' 설정 시 한글 메시지를 반환해야 한다", () => {
      initMessageGetter("kr");

      expect(getMessage("INTERNAL_ERROR")).toBe(
         "서버 내부 오류가 발생했습니다."
      );
   });

   it("'en' 설정 시 영어 메시지를 반환해야 한다", () => {
      initMessageGetter("en");

      expect(getMessage("UNAUTHORIZED_ERROR")).toBe(
         "Authentication is required."
      );
   });

   it("initMessageGetter는 한 번만 초기화되어야 한다", () => {
      initMessageGetter("en");
      initMessageGetter("kr"); // 무시되어야 함

      expect(getMessage("INTERNAL_ERROR")).toBe(
         "Internal server error occurred."
      );
   });

   it("초기화 없이 getMessage를 호출하면 예외가 발생해야 한다", () => {
      expect(() => getMessage("INTERNAL_ERROR")).toThrow(
         "❌ You must call initMessageGetter(lang) before using getMessage."
      );
   });

   it("reset을 한 후에 geMessage를 호출하면 예외가 발생한다 ", () => {
      initMessageGetter("kr");
      resetMessageGetter();

      expect(() => getMessage("INTERNAL_ERROR")).toThrow(
         "❌ You must call initMessageGetter(lang) before using getMessage."
      );
   });

   it("존재하지 않는 키에 대해 fallback 메시지를 반환해야 한다", () => {
      initMessageGetter("kr");

      // @ts-expect-error 일부러 없는 키 전달해서 테스트!!
      expect(getMessage("NOT_EXIST_KEY")).toContain("Unknown message key");
   });
});

describe("messages + client 통합 테스트", () => {
   beforeEach(() => {
      // 테스트 시작 전에 항상 클라이언트 초기화
      createClient({
         lang: "kr",
         pagination: {
            pageIndex: "pageIndex",
            pageSize: "pageSize",
            sortBy: "sortBy",
            sortOrder: "asc",
         },
      });
   });

   it("한국어 메시지를 반환해야 한다", () => {
      expect(getMessage("INTERNAL_ERROR")).toBe(
         "서버 내부 오류가 발생했습니다."
      );
      expect(getMessage("UNAUTHORIZED_ERROR")).toBe("인증이 필요합니다.");
   });

   it("영어 메시지를 반환해야 한다", () => {
      resetMessageGetter();
      createClient({
         lang: "en",
         pagination: {
            pageIndex: "pageIndex",
            pageSize: "pageSize",
            sortBy: "sortBy",
            sortOrder: "asc",
         },
      });

      expect(getMessage("INTERNAL_ERROR")).toBe(
         "Internal server error occurred."
      );
      expect(getMessage("UNAUTHORIZED_ERROR")).toBe(
         "Authentication is required."
      );
   });

   it("✅ 존재하지 않는 키는 fallback 메시지를 반환한다", () => {
      // @ts-expect-error: intentionally pass wrong key
      expect(getMessage("NOT_EXISTING_KEY")).toContain("Unknown message key");
   });
});
