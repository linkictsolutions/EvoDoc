import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function seed() {
  const { adminAuth, adminDb } = await import("../src/lib/firebase/admin");
  const { defaultCompanyConfiguration } = await import("../src/domain/company-configuration");
  const orgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "demo-org";
  const uid = "dev-admin";
  const devAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"
    || process.env.ENABLE_DEV_AUTH === "true";

  await adminDb.doc(`organizations/${orgId}`).set({
    name: "Demo Coffee Export Ltd",
    code: "DEMO",
    status: "active",
    defaultCurrency: "USD",
    defaultUnits: "kg",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await adminDb.doc(`organizations/${orgId}/users/${uid}`).set({
    email: "dev-admin@example.com",
    displayName: "Dev Admin",
    role: "admin",
    isApprover: true,
    orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await adminDb.doc(`organizations/${orgId}/settings/companyConfiguration`).set(
    {
      ...defaultCompanyConfiguration(orgId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  if (!devAuthEnabled) {
    try {
      await adminAuth.getUser(uid);
    } catch {
      await adminAuth.createUser({
        uid,
        email: "dev-admin@example.com",
        password: "password123",
        displayName: "Dev Admin",
      });
    }
  } else {
    console.log("Skipping Firebase Auth user provisioning because dev auth mode is enabled.");
  }

  console.log(`Seeded org ${orgId} and user ${uid}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
