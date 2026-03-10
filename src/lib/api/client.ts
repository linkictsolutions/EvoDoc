import type { ApiEnvelope } from "@/types/models";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"
      ? undefined
      : await getFirebaseAuthClient().currentUser?.getIdToken();

  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"
        ? {
            "x-dev-uid": "dev-admin",
            "x-dev-role": "admin",
            "x-dev-email": "dev-admin@example.com",
            "x-dev-approver": "true",
          }
        : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload.data;
}
