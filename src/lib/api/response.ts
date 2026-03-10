import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@/types/models";

export function getRequestId(): string {
  return crypto.randomUUID();
}

export function ok<T>(requestId: string, data: T, status = 200) {
  const body: ApiEnvelope<T> = {
    ok: true,
    data,
    requestId,
  };

  return NextResponse.json(body, { status });
}

export function fail(requestId: string, error: string, status = 400) {
  const body: ApiEnvelope<never> = {
    ok: false,
    error,
    requestId,
  };

  return NextResponse.json(body, { status });
}
