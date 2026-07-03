import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as admin from "firebase-admin";
import {
  createWaitlistEntryCore,
  fcmTokenRegistrationDocId,
  processDeletionOperation,
  registerPushTokenForUser,
  unregisterPushTokenForUser,
} from "./registration";

const hasFirebaseEmulators = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const describeWithEmulators = hasFirebaseEmulators ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || "strength-save-m1-test"
  : "strength-save-m1-test";

const collectionsToClean = [
  "users",
  "waitlist_entries",
  "waitlist_rate_limits",
  "fcm_token_registrations",
  "deletion_operations",
  "workouts",
  "measurements",
  "plan_cycles",
  "weekly_summaries",
  "chat_messages",
  "strava_activities",
  "ai_usage",
  "api_audit_logs",
  "notification_logs",
  "app_telemetry_daily",
  "email_verification_codes",
  "strava_connections",
  "training_plans",
  "api_keys",
  "api_rate_limits",
  "auth_audit_logs",
];

const cleanCollection = async (collection: string): Promise<void> => {
  const db = admin.firestore();
  while (true) {
    const snap = await db.collection(collection).limit(100).get();
    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
};

const expectAuthMissing = async (uid: string): Promise<void> => {
  await expect(admin.auth().getUser(uid)).rejects.toMatchObject({ code: "auth/user-not-found" });
};

describeWithEmulators("registration integration on Firebase emulators", () => {
  beforeAll(() => {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId });
    }
  });

  beforeEach(async () => {
    await Promise.all(collectionsToClean.map(cleanCollection));
    const users = await admin.auth().listUsers();
    await Promise.all(users.users.map((user) => admin.auth().deleteUser(user.uid)));
  });

  afterAll(async () => {
    await Promise.all(admin.apps.map((app) => app?.delete()));
  });

  it("atomically reassigns an FCM token from account A to B and owner A cannot revoke B", async () => {
    const token = "fcm-token-shared-device";
    const tokenRef = admin.firestore().collection("fcm_token_registrations").doc(fcmTokenRegistrationDocId(token));
    await admin.firestore().collection("users").doc("user-a").set({ fcmTokens: [token] });
    await admin.firestore().collection("users").doc("user-b").set({ fcmTokens: [] });

    await registerPushTokenForUser("user-a", token, "iphone");
    await registerPushTokenForUser("user-b", token, "iphone");

    await expect(tokenRef.get()).resolves.toMatchObject({
      exists: true,
    });
    expect((await tokenRef.get()).data()).toMatchObject({
      userId: "user-b",
      token,
      deviceId: "iphone",
    });
    expect((await admin.firestore().collection("users").doc("user-a").get()).data()?.fcmTokens || []).not.toContain(token);

    await unregisterPushTokenForUser("user-a", token);
    expect((await tokenRef.get()).data()?.userId).toBe("user-b");

    await unregisterPushTokenForUser("user-b", token);
    expect((await tokenRef.get()).exists).toBe(false);
  });

  it("retries deletion after Auth disappeared and finishes Firestore purge idempotently", async () => {
    const uid = "delete-me";
    await admin.auth().createUser({ uid, email: "delete-me@example.com" });
    await admin.firestore().collection("users").doc(uid).set({ uid, deletionPending: { requestedAt: "old" } });
    await admin.firestore().collection("workouts").doc("w1").set({ userId: uid });
    await admin.firestore().collection("measurements").doc("m1").set({ userId: uid });
    await admin.firestore().collection("email_verification_codes").doc("code1").set({ uid });
    await admin.firestore().collection("training_plans").doc(uid).set({ userId: uid });
    await admin.firestore().collection("strava_connections").doc(uid).set({ userId: uid });
    await admin.firestore().collection("fcm_token_registrations").doc("token1").set({ userId: uid, token: "token1" });
    await admin.firestore().collection("deletion_operations").doc(uid).set({
      uid,
      state: "failed",
      attempts: 1,
      requestedAt: "old",
      updatedAt: "old",
    });

    await admin.auth().deleteUser(uid);
    await processDeletionOperation(uid, { deleteAvatarFiles: async () => undefined });
    await processDeletionOperation(uid, { deleteAvatarFiles: async () => undefined });

    await expectAuthMissing(uid);
    await Promise.all([
      expect(admin.firestore().collection("users").doc(uid).get()).resolves.toMatchObject({ exists: false }),
      expect(admin.firestore().collection("workouts").where("userId", "==", uid).get()).resolves.toMatchObject({ empty: true }),
      expect(admin.firestore().collection("measurements").where("userId", "==", uid).get()).resolves.toMatchObject({ empty: true }),
      expect(admin.firestore().collection("email_verification_codes").where("uid", "==", uid).get()).resolves.toMatchObject({ empty: true }),
      expect(admin.firestore().collection("fcm_token_registrations").where("userId", "==", uid).get()).resolves.toMatchObject({ empty: true }),
      expect(admin.firestore().collection("training_plans").doc(uid).get()).resolves.toMatchObject({ exists: false }),
      expect(admin.firestore().collection("strava_connections").doc(uid).get()).resolves.toMatchObject({ exists: false }),
    ]);
    expect((await admin.firestore().collection("deletion_operations").doc(uid).get()).data()?.state).toBe("completed");
  });
});

describeWithEmulators("createWaitlistEntryCore (R2-05 smoke)", () => {
  beforeAll(() => {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId });
    }
  });

  beforeEach(async () => {
    await Promise.all(["waitlist_entries", "waitlist_rate_limits"].map(cleanCollection));
  });

  it("zapis na waitliste przechodzi (transakcja: wszystkie ready przed zapisami)", async () => {
    const result = await createWaitlistEntryCore({
      email: "waitlist-repro@test.pl",
      displayName: "",
      note: "",
      source: "login",
    });

    expect(result.existing).toBe(false);
    const saved = await admin.firestore().collection("waitlist_entries").doc(result.entryId).get();
    expect(saved.exists).toBe(true);
    expect(saved.data()?.email).toBe("waitlist-repro@test.pl");
  });

  it("drugi zapis tym samym mailem po cooldownie zwraca existing", async () => {
    const first = await createWaitlistEntryCore({ email: "waitlist-dup@test.pl", displayName: "", note: "", source: "login" });
    // Omin cooldown 60 s: cofnij lastRequestAt w dokumencie rate limitu.
    const rates = await admin.firestore().collection("waitlist_rate_limits").get();
    await Promise.all(rates.docs.map((doc) => doc.ref.set({ lastRequestAt: new Date(Date.now() - 120_000).toISOString() }, { merge: true })));

    const second = await createWaitlistEntryCore({ email: "waitlist-dup@test.pl", displayName: "", note: "", source: "login" });

    expect(second.existing).toBe(true);
    expect(second.entryId).toBe(first.entryId);
  });
});
