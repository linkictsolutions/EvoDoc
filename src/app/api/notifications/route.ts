import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import { listNotifications } from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);
    const notifications = await listNotifications(orgId);

    return ok(requestId, notifications);
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}
