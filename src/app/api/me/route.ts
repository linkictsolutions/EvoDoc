import { NextRequest } from "next/server";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    const actor = await requireActor(orgId, ["admin", "editor", "viewer"]);
    return ok(requestId, actor);
  } catch (error) {
    return fail(requestId, (error as Error).message, 401);
  }
}
