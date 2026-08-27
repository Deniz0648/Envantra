export type ApiErrorCode = "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "RATE_LIMITED" | "NOT_FOUND" | "CONFLICT" | "SITE_DATABASE_UNAVAILABLE" | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(public readonly code: ApiErrorCode, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) return Response.json({ ok: false, error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  if(typeof error==="object"&&error!==null&&"code" in error){if(error.code==="23505")return Response.json({ok:false,error:{code:"CONFLICT",message:"Aynı değerlere sahip aktif bir kayıt zaten bulunuyor."}},{status:409});if(error.code==="23503")return Response.json({ok:false,error:{code:"VALIDATION_ERROR",message:"İlişkili kayıt bulunamadı veya halen kullanımda."}},{status:400})}
  console.error("Beklenmeyen hata", error instanceof Error ? error.message : "Bilinmeyen hata");
  return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "İşlem tamamlanamadı." } }, { status: 500 });
}

export function ok<T>(data: T, init?: ResponseInit): Response { return Response.json({ ok: true, data }, init); }
