import { LangType } from "./client";

const MESSAGES = {
   kr: {
      INTERNAL_ERROR: "서버 내부 오류가 발생했습니다.",
      UNAUTHORIZED_ERROR: "인증이 필요합니다.",
      UNKNOWN_ERROR: "알 수 없는 에러가 발생했습니다.",
      FORBIDDEN_ERROR: "접근 권한이 없습니다.",
      VALIDATION_ERROR: "유효성 검사 오류가 발생했습니다.",
      NOT_FOUND_ERROR: "해당 데이터가 존재하지 않습니다.",
      WRONG_PATH_ERROR: "잘못된 경로입니다.",
      UPDATE_NO_BODY_ERROR: "업데이트할 데이터가 없습니다.",
      UNIQUE_ERROR: "이미 존재하는 고유값입니다.",
      TIMEOUT_ERROR: "서버 응답이 없습니다.",
      SIGNATURE_ERROR: "시그니처 검증에 실패했습니다.",
   },
   en: {
      INTERNAL_ERROR: "Internal server error occurred.",
      UNAUTHORIZED_ERROR: "Authentication is required.",
      UNKNOWN_ERROR: "Unknown error occurred.",
      FORBIDDEN_ERROR: "Access is forbidden.",
      VALIDATION_ERROR: "Validation error occurred.",
      NOT_FOUND_ERROR: "Data not found.",
      WRONG_PATH_ERROR: "Invalid path.",
      UPDATE_NO_BODY_ERROR: "No update data provided.",
      UNIQUE_ERROR: "Unique constraint violated.",
      TIMEOUT_ERROR: "Server response timed out.",
      SIGNATURE_ERROR: "Signature validation failed.",
   },
   fn: {},
} as const;

export type MessageKey = keyof (typeof MESSAGES)["kr"];

let _getMessage: ((key: MessageKey) => string) | null = null;

function initMessageGetter(lang: LangType) {
   if (_getMessage) return; // 이미 초기화됐다면 무시

   _getMessage = (key: MessageKey) => {
      const fallback = MESSAGES["kr"][key];
      const selected = MESSAGES[lang]?.[key];

      return selected || fallback || `Unknown message key: ${key}`;
   };
}

function getMessage(messageKey: MessageKey) {
   if (!_getMessage) {
      throw new Error(
         "❌ You must call initMessageGetter(lang) before using getMessage."
      );
   }
   return _getMessage(messageKey);
}

function resetMessageGetter() {
   _getMessage = null;
}

export { initMessageGetter, getMessage, resetMessageGetter };
