import { ZodError } from "zod";
import { getMessage } from "./messeage";

export enum ServerErrorType {
   FETCH = "fetch",
   SERVER_ACTION = "server-action",
}

export class ServerError extends Error {
   public type: ServerErrorType;
   public code: number;
   public payload?: any;
   public method?: string;
   public url?: string;

   constructor({
      code,
      message,
      method,
      url,
      payload,
   }: {
      code: number;
      message: string;
      payload?: any;
      method?: string;
      url?: string;
   }) {
      super(message);
      this.code = code;
      this.payload = payload;

      if (url) {
         this.url = url;
         this.method = method ?? "none";
         this.type = ServerErrorType.FETCH;
      } else {
         this.method = method ?? "none";
         this.type = ServerErrorType.SERVER_ACTION;
      }
   }
}

export class UnauthorizedError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 401, message: getMessage("UNAUTHORIZED_ERROR"), ...args });
   }
}

export class ForbiddenError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 403, message: getMessage("FORBIDDEN_ERROR"), ...args });
   }
}

export class ValidationError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 400, message: getMessage("VALIDATION_ERROR"), ...args });
   }
}

export class NotFoundError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 404, message: getMessage("NOT_FOUND_ERROR"), ...args });
   }
}

export class InternalServerError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 500, message: getMessage("INTERNAL_ERROR"), ...args });
   }
}

export class TimeoutError extends ServerError {
   constructor(
      args: Omit<
         ConstructorParameters<typeof ServerError>[0],
         "code" | "message"
      >
   ) {
      super({ code: 408, message: getMessage("TIMEOUT_ERROR"), ...args });
   }
}

export function handleServerError<T extends Record<string, any>, D>(
   error: unknown,
   payload?: T
): ServerResponse<T, D> {
   console.error("[Server Error]", error);

   if (error instanceof ZodError) {
      return {
         code: 400,
         message: error.errors[0]?.message || getMessage("VALIDATION_ERROR"),
         payload,
      };
   }

   if (error instanceof ServerError) {
      return {
         code: error.code,
         message: error.message,
         payload: error.payload,
      };
   }

   return {
      code: 500,
      message: getMessage("UNKNOWN_ERROR"),
      payload,
   };
}
