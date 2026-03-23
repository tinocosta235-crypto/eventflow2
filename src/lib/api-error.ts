import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Centralised API error handler.
 * In development returns full error details.
 * In production logs internally and returns a generic 500.
 */
export function handleApiError(err: unknown, context?: string): NextResponse {
  if (isDev) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[api-error]${context ? ` [${context}]` : ""}`, err);
    return NextResponse.json(
      { error: message, stack, context },
      { status: 500 }
    );
  }

  // Production: log without leaking details to the client
  const errorId = Math.random().toString(36).slice(2, 10).toUpperCase();
  console.error(
    `[api-error] errorId=${errorId}${context ? ` context=${context}` : ""}`,
    err instanceof Error ? err.message : err
  );

  return NextResponse.json(
    { error: "Si è verificato un errore interno. Riprova più tardi.", errorId },
    { status: 500 }
  );
}
