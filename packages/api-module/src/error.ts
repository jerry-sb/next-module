import { ZodError } from "zod";
import { getMessage } from "./messeage";

// 베이스 서버 에러 (심플하게 유지)
export class ServerError extends Error {
   public code: number;

   constructor(code: number, message: string) {
      super(message);
      this.code = code;
   }
}

// 각 상태코드별 에러 정의
export class UnauthorizedError extends ServerError {
   constructor(message = getMessage("UNAUTHORIZED_ERROR")) {
      super(401, message);
   }
}

export class ForbiddenError extends ServerError {
   constructor(message = getMessage("FORBIDDEN_ERROR")) {
      super(403, message);
   }
}

export class ValidationError extends ServerError {
   constructor(message = getMessage("VALIDATION_ERROR")) {
      super(400, message);
   }
}

export class NotFoundError extends ServerError {
   constructor(message = getMessage("NOT_FOUND_ERROR")) {
      super(404, message);
   }
}

export class InternalServerError extends ServerError {
   constructor(message = getMessage("INTERNAL_ERROR")) {
      super(500, message);
   }
}

export class TimeoutError extends ServerError {
   constructor(message = getMessage("TIMEOUT_ERROR")) {
      super(408, message);
   }
}

type ErrorMeta = {
   url: string;
   method: string;
   body?: Record<string, any>;
};

export type ErrorResponse<T = ErrorMeta> = {
   code: number;
   message: string;
   error: T;
};

type ErrorHandler<T = ErrorMeta> = (
   error: unknown,
   req: Request
) => Promise<ErrorResponse<T>>;

let globalErrorHandler: ErrorHandler<any> | undefined;

export function setGlobalErrorHandler<T = ErrorMeta>(handler: ErrorHandler<T>) {
   globalErrorHandler = handler;
}

export async function handleServerError(
   error: unknown,
   req: Request
): Promise<ErrorResponse> {
   const fallbackData: ErrorMeta = {
      url: req.url,
      method: req.method,
   };

   const parsedBody = await req.json().catch(() => undefined);
   const data: ErrorMeta = {
      ...fallbackData,
      ...(parsedBody && typeof parsedBody === "object"
         ? { body: parsedBody }
         : {}),
   };

   if (globalErrorHandler) {
      try {
         return await globalErrorHandler(error, req);
      } catch (e) {
         console.error("💥 Global error handler failure", e);
         return {
            code: 500,
            message: JSON.stringify(e),
            error: data,
         };
      }
   }

   console.error("[Server Error]", error);

   if (error instanceof ZodError) {
      return {
         code: 400,
         message: error.errors[0]?.message || getMessage("VALIDATION_ERROR"),
         error: data,
      };
   }

   if (error instanceof ServerError) {
      return {
         code: error.code,
         message: error.message,
         error: data,
      };
   }

   return {
      code: 500,
      message: getMessage("UNKNOWN_ERROR"),
      error: data,
   };
}
