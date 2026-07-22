import { NextRequest } from "next/server";
import { saveContractAttachment } from "@/lib/attachments/storage";
import { requireActor } from "@/lib/auth/server";
import { fail, getRequestId, ok } from "@/lib/api/response";

const ALLOWED_STAGES = new Set([
  "contract_sheet",
  "shipping_instruction_sheet",
  "bank_lc_sheet",
  "bill_of_lading_sheet",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId();

  try {
    const { id: contractId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const orgId = String(formData.get("orgId") ?? "");
    const stage = String(formData.get("stage") ?? "");

    if (!orgId) {
      return fail(requestId, "orgId is required", 400);
    }

    if (!ALLOWED_STAGES.has(stage)) {
      return fail(requestId, "Invalid attachment stage", 400);
    }

    if (!(file instanceof File)) {
      return fail(requestId, "File is required", 400);
    }

    if (file.size <= 0) {
      return fail(requestId, "File is empty", 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return fail(requestId, "File exceeds the 25 MB upload limit", 400);
    }

    await requireActor(orgId, ["admin", "editor"]);

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await saveContractAttachment({
      orgId,
      contractId,
      stage: stage as "contract_sheet" | "shipping_instruction_sheet" | "bank_lc_sheet" | "bill_of_lading_sheet",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      buffer,
    });

    return ok(requestId, attachment);
  } catch (error) {
    return fail(requestId, (error as Error).message, 500);
  }
}
