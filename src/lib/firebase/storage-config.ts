export function resolvePrimaryStorageBucket(): string | undefined {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return bucket?.trim() || undefined;
}

export function getFirebaseProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || undefined;
}

export function getStorageBucketCandidates(): string[] {
  const projectId = getFirebaseProjectId();
  const candidates: string[] = [];

  const explicit = resolvePrimaryStorageBucket();
  if (explicit) {
    candidates.push(explicit);
  }

  if (projectId) {
    // New Firebase projects default to this bucket format.
    candidates.push(`${projectId}.firebasestorage.app`);
    // Legacy/default bucket format for older projects.
    candidates.push(`${projectId}.appspot.com`);
  }

  return [...new Set(candidates)];
}

export function isBucketMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /bucket does not exist|specified bucket|not found/i.test(message);
}

export function formatStorageBucketHelpMessage(attempted: string[]): string {
  const listed = attempted.length > 0 ? attempted.join(", ") : "none";
  return `Firebase Storage bucket not found. Tried: ${listed}. Enable Storage in Firebase Console and set FIREBASE_STORAGE_BUCKET to the bucket shown there (for example your-project.firebasestorage.app).`;
}
