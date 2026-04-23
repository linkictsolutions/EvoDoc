import { headers } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Actor, UserRole } from "@/types/models";

function isAllowedRole(role: UserRole, allowed?: UserRole[]): boolean {
  if (!allowed || allowed.length === 0) {
    return true;
  }

  return allowed.includes(role);
}

export async function getActor(orgId: string): Promise<Actor> {
  const headerBag = await headers();
  const devAuthEnabled = process.env.ENABLE_DEV_AUTH === "true";

  if (devAuthEnabled) {
    const uid = headerBag.get("x-dev-uid") ?? "dev-admin";
    const role = (headerBag.get("x-dev-role") as UserRole | null) ?? "admin";
    const isApprover = headerBag.get("x-dev-approver") !== "false";

    return {
      uid,
      email: headerBag.get("x-dev-email") ?? "dev-admin@example.com",
      orgId,
      role,
      isApprover,
    };
  }

  const authHeader = headerBag.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const idToken = authHeader.slice("Bearer ".length);
  const decoded = await adminAuth.verifyIdToken(idToken);
  const userDoc = await adminDb.doc(`organizations/${orgId}/users/${decoded.uid}`).get();

  if (!userDoc.exists) {
    throw new Error("User does not belong to this organization");
  }

  const userData = userDoc.data() as {
    email: string;
    role: UserRole;
    isApprover?: boolean;
  };

  return {
    uid: decoded.uid,
    email: userData.email,
    orgId,
    role: userData.role,
    isApprover: Boolean(userData.isApprover),
  };
}

export async function requireActor(orgId: string, allowedRoles?: UserRole[]): Promise<Actor> {
  const actor = await getActor(orgId);

  if (!isAllowedRole(actor.role, allowedRoles)) {
    throw new Error("Insufficient role");
  }

  return actor;
}
