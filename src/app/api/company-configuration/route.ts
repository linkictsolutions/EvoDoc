import { NextRequest } from "next/server";
import {
  defaultCompanyConfiguration,
  resolveCompanyConfiguration,
  validateAndNormalizeCompanyConfigurationPayload,
} from "@/domain/company-configuration";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";
import {
  appendAuditLog,
  getCompanyConfiguration,
  upsertCompanyConfiguration,
} from "@/lib/repositories/firestore-repository";

export async function GET(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return fail(requestId, "Missing orgId", 400);
    }

    await requireActor(orgId, ["admin", "editor", "viewer"]);

    try {
      const configuration = await getCompanyConfiguration(orgId);
      return ok(requestId, resolveCompanyConfiguration(orgId, configuration));
    } catch {
      return ok(requestId, defaultCompanyConfiguration(orgId));
    }
  } catch (error) {
    return fail(requestId, (error as Error).message, 403);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const normalized = validateAndNormalizeCompanyConfigurationPayload(body);
    const actor = await requireActor(normalized.companyConfiguration.orgId, ["admin", "editor"]);
    const targetPath = await upsertCompanyConfiguration(
      normalized.companyConfiguration.orgId,
      normalized.companyConfiguration,
    );

    await appendAuditLog(
      normalized.companyConfiguration.orgId,
      actor.uid,
      "companyConfiguration.updated",
      targetPath,
      null,
      {
        sellerName: normalized.companyConfiguration.sellerName,
        defaultOrigin: normalized.companyConfiguration.defaultOrigin,
        defaultHsCode: normalized.companyConfiguration.defaultHsCode,
      },
      requestId,
    );

    return ok(requestId, { saved: true, targetPath });
  } catch (error) {
    return fail(requestId, (error as Error).message, 400);
  }
}
