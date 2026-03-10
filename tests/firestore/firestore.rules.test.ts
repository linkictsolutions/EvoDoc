import fs from "node:fs";
import { beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "evodoc-test",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc("organizations/demo-org/users/admin-1").set({
      role: "admin",
      isApprover: true,
      email: "admin@example.com",
    });

    await context.firestore().doc("organizations/demo-org/users/viewer-1").set({
      role: "viewer",
      isApprover: false,
      email: "viewer@example.com",
    });
  });
});

describe("firestore rules", () => {
  it("allows admin to write contracts", async () => {
    const adminContext = testEnv.authenticatedContext("admin-1");
    const adminDb = adminContext.firestore();

    await assertSucceeds(
      adminDb.doc("organizations/demo-org/contracts/contract-1").set({
        terms: { quantityBags: 10, bagWeightKg: 50, unitPrice: 2 },
        processing: { moisturePercent: 10 },
      }),
    );
  });

  it("denies viewer writes", async () => {
    const viewerContext = testEnv.authenticatedContext("viewer-1");
    const viewerDb = viewerContext.firestore();

    await assertFails(viewerDb.doc("organizations/demo-org/contracts/contract-2").set({ status: "draft" }));
  });
});
