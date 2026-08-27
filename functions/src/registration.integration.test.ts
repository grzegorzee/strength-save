import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as admin from "firebase-admin";
import type { CallableRequest } from "firebase-functions/v2/https";

const sesEmailMock = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("./ses-email", async (importOriginal) => ({
  ...await importOriginal<typeof import("./ses-email")>(),
  sendSesEmail: sesEmailMock.send,
}));

import {
  createWaitlistEntryCore,
  fcmTokenRegistrationDocId,
  processDeletionOperation,
  pendingSubscriptionGrantId,
  requestEmailVerificationCode,
  registerPushTokenForUser,
  syncUserProfile,
  unregisterPushTokenForUser,
  verifyEmailCode,
} from "./registration";
import { adminUpdateBugReport, createBugReport } from "./bug-reports";
import {
  STRENGTH_SAVE_ANDROID_APP_CHECK_ID,
  STRENGTH_SAVE_IOS_APP_CHECK_ID,
} from "./security";

const hasFirebaseEmulators = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const describeWithEmulators = hasFirebaseEmulators ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || "strength-save-m1-test"
  : "strength-save-m1-test";

const collectionsToClean = [
  "users",
  "config",
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
  "email_log",
  "bug_reports",
  "bug_report_rate_limits",
  "pending_subscription_grants",
];

const callableRequest = <T>(input: {
  uid: string;
  email: string;
  data: T;
  appId?: string;
}): CallableRequest<T> => ({
  data: input.data,
  auth: {
    uid: input.uid,
    rawToken: "emulator-auth-token",
    token: {
      uid: input.uid,
      sub: input.uid,
      email: input.email,
      name: "Test User",
      firebase: { sign_in_provider: "password", identities: {} },
    },
  },
  app: input.appId ? {
    appId: input.appId,
    token: {
      app_id: input.appId,
      aud: ["projects/strength-save-m1-test"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://firebaseappcheck.googleapis.com/strength-save-m1-test",
      sub: input.appId,
    },
  } : undefined,
  rawRequest: {} as CallableRequest<T>["rawRequest"],
  acceptsStreaming: false,
});

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
    process.env.SES_REGION = "eu-central-1";
    process.env.SES_ACCESS_KEY_ID = "ses-emulator-access-key";
    process.env.SES_SECRET_ACCESS_KEY = "ses-emulator-secret-key";
    process.env.SES_FROM = "Strength Save <noreply@strengthsave.app>";
    process.env.API_KEY_PEPPER = "emulator-pepper";
    sesEmailMock.send.mockReset();
    sesEmailMock.send.mockResolvedValue({ transport: "ses", sesMessageId: "email-emulator" });
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

  it.each([
    ["iOS", "ios", STRENGTH_SAVE_IOS_APP_CHECK_ID],
    ["Android", "android", STRENGTH_SAVE_ANDROID_APP_CHECK_ID],
  ])("completes attested %s registration through email verification and reaches onboarding state", async (
    _platformName,
    platformSlug,
    appId,
  ) => {
    const uid = `attested-${platformSlug}-user`;
    const email = `attested-${platformSlug}@example.com`;
    const requestBase = { uid, email, appId };

    const syncResult = await syncUserProfile.run(callableRequest({
      ...requestBase,
      data: { language: "pl", inviteCode: null },
    }));

    expect(syncResult.profile).toMatchObject({
      uid,
      email,
      status: "pending_verification",
      access: { enabled: false },
      onboardingCompleted: false,
      onboarding: { state: "not_started" },
    });

    await expect(requestEmailVerificationCode.run(callableRequest({
      ...requestBase,
      data: { language: "pl" },
    }))).resolves.toEqual({ sent: true });

    const verificationSubject = String(sesEmailMock.send.mock.calls[0]?.[0]?.subject || "");
    const code = verificationSubject.match(/(\d{6})$/)?.[1];
    expect(code).toMatch(/^\d{6}$/);

    await expect(verifyEmailCode.run(callableRequest({
      ...requestBase,
      data: { code },
    }))).resolves.toEqual({ verified: true });

    const profile = (await admin.firestore().collection("users").doc(uid).get()).data();
    expect(profile).toMatchObject({
      status: "active",
      access: { enabled: true },
      onboardingCompleted: false,
      onboarding: { state: "in_progress", version: 1 },
    });
    expect(profile?.verification?.emailVerifiedAt).toEqual(expect.any(String));
    expect(sesEmailMock.send).toHaveBeenCalledTimes(2);

    // T21b: obie wysyłki zostawiają wpis w email_log; kod weryfikacyjny BEZ
    // treści i z zamaskowanym tematem (temat zawiera kod logowania).
    const emailLog = await admin.firestore().collection("email_log").where("uid", "==", uid).get();
    expect(emailLog.docs.map((entry) => entry.data().type).sort()).toEqual(["verification_code", "welcome_email"]);
    const verificationEntry = emailLog.docs.find((entry) => entry.data().type === "verification_code");
    expect(verificationEntry?.data()).toMatchObject({ subject: "[verification code]", transport: "ses", status: "sent", sesMessageId: "email-emulator" });
    expect((await verificationEntry?.ref.collection("content").doc("body").get())?.exists).toBe(false);
    const welcomeEntry = emailLog.docs.find((entry) => entry.data().type === "welcome_email");
    const welcomeContent = await welcomeEntry?.ref.collection("content").doc("body").get();
    expect(welcomeContent?.exists).toBe(true);
    expect(String(welcomeContent?.data()?.html ?? "")).not.toBe("");
  });

  it("claims a pre-registration PRO grant exactly once without bypassing email verification", async () => {
    const uid = "future-pro-user";
    const email = "Future.Pro@Example.com";
    const grantRef = admin.firestore().collection("pending_subscription_grants")
      .doc(pendingSubscriptionGrantId(email));
    await grantRef.set({
      status: "pending",
      days: null,
      createdAt: new Date().toISOString(),
      createdBy: "integration-test",
    });

    const syncResult = await syncUserProfile.run(callableRequest({
      uid,
      email: email.toLowerCase(),
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: { language: "pl", inviteCode: null },
    }));

    expect(syncResult.profile).toMatchObject({
      uid,
      status: "pending_verification",
      access: { enabled: false },
      subscription: { tier: "comp", status: "active", expiresAt: null },
    });
    expect((await grantRef.get()).exists).toBe(false);

    const startedAt = syncResult.profile.subscription.startedAt;
    const secondSync = await syncUserProfile.run(callableRequest({
      uid,
      email: email.toLowerCase(),
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: { language: "pl", inviteCode: null },
    }));
    expect(secondSync.profile.subscription.startedAt).toBe(startedAt);
  });

  it("removes pending_send after an SES rejection and allows an immediate retry", async () => {
    const uid = "ses-retry-user";
    const email = "ses-retry@example.com";
    await admin.firestore().collection("users").doc(uid).set({
      uid,
      email,
      displayName: "Retry User",
      role: "user",
      status: "pending_verification",
      access: { enabled: false },
      language: "pl",
    });

    sesEmailMock.send.mockRejectedValueOnce(new Error("SES account is still in sandbox"));
    const request = callableRequest({
      uid,
      email,
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: { language: "pl" },
    });

    await expect(requestEmailVerificationCode.run(request)).rejects.toMatchObject({ code: "unavailable" });
    await expect(admin.firestore().collection("email_verification_codes").where("uid", "==", uid).get())
      .resolves.toMatchObject({ empty: true });

    const failedEmailLog = await admin.firestore().collection("email_log")
      .where("uid", "==", uid).where("status", "==", "failed").get();
    expect(failedEmailLog.docs[0]?.data()).toMatchObject({
      subject: "[verification code]",
      transport: "ses",
      error: "ses-send-failed",
    });
    const failedNotificationLog = await admin.firestore().collection("notification_logs")
      .where("userId", "==", uid).get();
    expect(failedNotificationLog.docs[0]?.data()).toMatchObject({
      type: "verification_code",
      transport: "ses",
      error: "ses-send-failed",
    });

    sesEmailMock.send.mockResolvedValueOnce({ transport: "ses", sesMessageId: "ses-retry-success" });
    await expect(requestEmailVerificationCode.run(request)).resolves.toEqual({ sent: true });
    const retriedCode = await admin.firestore().collection("email_verification_codes").where("uid", "==", uid).get();
    expect(retriedCode.docs[0]?.data()).toMatchObject({ status: "pending" });
  });

  it("keeps an unattested web registration without invite out of users", async () => {
    const uid = "unattested-web-user";

    await expect(syncUserProfile.run(callableRequest({
      uid,
      email: "unattested-web@example.com",
      data: { language: "pl", inviteCode: null },
    }))).rejects.toMatchObject({
      code: "permission-denied",
      details: { reason: "app-verification-required" },
    });

    await expect(admin.firestore().collection("users").doc(uid).get())
      .resolves.toMatchObject({ exists: false });
  });

  it("returns a distinct registration-closed reason without creating a user", async () => {
    const uid = "closed-registration-user";
    await admin.firestore().collection("config").doc("feature_flags").set({ registrationOpen: false });

    await expect(syncUserProfile.run(callableRequest({
      uid,
      email: "registration-closed@example.com",
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: { language: "pl", inviteCode: null },
    }))).rejects.toMatchObject({
      code: "permission-denied",
      details: { reason: "registration-closed" },
    });

    await expect(admin.firestore().collection("users").doc(uid).get())
      .resolves.toMatchObject({ exists: false });
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
    await admin.firestore().collection("bug_reports").doc(`${uid}_report-1`).set({ userId: uid, status: "new" });
    await admin.firestore().collection("bug_report_rate_limits").doc(uid).set({ userId: uid, hourCount: 1, dayCount: 1 });
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
      expect(admin.firestore().collection("bug_reports").where("userId", "==", uid).get()).resolves.toMatchObject({ empty: true }),
      expect(admin.firestore().collection("bug_report_rate_limits").doc(uid).get()).resolves.toMatchObject({ exists: false }),
      expect(admin.firestore().collection("training_plans").doc(uid).get()).resolves.toMatchObject({ exists: false }),
      expect(admin.firestore().collection("strava_connections").doc(uid).get()).resolves.toMatchObject({ exists: false }),
    ]);
    expect((await admin.firestore().collection("deletion_operations").doc(uid).get()).data()?.state).toBe("completed");
  });

  it("creates bug reports idempotently and does not count a retry twice", async () => {
    const uid = "bug-reporter";
    const email = "bug-reporter@example.com";
    await admin.auth().createUser({ uid, email });
    await admin.firestore().collection("users").doc(uid).set({
      uid,
      email,
      role: "user",
      status: "active",
      access: { enabled: true },
    });
    const clientRequestId = "123e4567-e89b-42d3-a456-426614174000";
    const request = callableRequest({
      uid,
      email,
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: {
        clientRequestId,
        category: "workout",
        message: "Przycisk zapisu nie reaguje po powrocie z tła.",
      },
    });

    const first = await createBugReport.run(request);
    const retry = await createBugReport.run(callableRequest({
      uid,
      email: "changed@example.com",
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: {
        clientRequestId,
        category: "ui",
        message: "Po timeoutcie doprecyzowuję: przycisk znika pod klawiaturą.",
        context: { platform: "ios", route: "/profile" },
      },
    }));

    expect(first).toEqual(retry);
    expect(first).toEqual({
      ok: true,
      reportId: `${uid}_${clientRequestId}`,
      uploadPath: `bug-reports/${uid}/${uid}_${clientRequestId}/screenshot.jpg`,
    });
    expect((await admin.firestore().collection("bug_report_rate_limits").doc(uid).get()).data())
      .toMatchObject({ hourCount: 1, dayCount: 1 });
    expect((await admin.firestore().collection("bug_reports").doc(`${uid}_${clientRequestId}`).get()).data())
      .toMatchObject({
        category: "ui",
        message: "Po timeoutcie doprecyzowuję: przycisk znika pod klawiaturą.",
        context: { platform: "ios", route: "/profile" },
        reporterEmail: email,
      });

    await admin.firestore().collection("bug_reports").doc(`${uid}_${clientRequestId}`).update({ status: "new" });
    await createBugReport.run(request);
    expect((await admin.firestore().collection("bug_reports").doc(`${uid}_${clientRequestId}`).get()).data())
      .toMatchObject({
        status: "new",
        category: "ui",
        message: "Po timeoutcie doprecyzowuję: przycisk znika pod klawiaturą.",
      });
  });

  it("allows only an admin to apply a valid bug report status transition", async () => {
    const adminUid = "bug-admin";
    const userUid = "bug-user";
    const reportId = `${userUid}_123e4567-e89b-42d3-a456-426614174010`;
    await Promise.all([
      admin.auth().createUser({ uid: adminUid, email: "bug-admin@example.com" }),
      admin.auth().createUser({ uid: userUid, email: "bug-user@example.com" }),
      admin.firestore().collection("users").doc(adminUid).set({ uid: adminUid, role: "admin", status: "active" }),
      admin.firestore().collection("users").doc(userUid).set({ uid: userUid, role: "user", status: "active" }),
      admin.firestore().collection("bug_reports").doc(reportId).set({ userId: userUid, status: "new" }),
    ]);
    const data = { reportId, status: "triaged", priority: "high", note: "Reproduced on iOS." };

    await expect(adminUpdateBugReport.run(callableRequest({
      uid: userUid,
      email: "bug-user@example.com",
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data,
    }))).rejects.toMatchObject({ code: "permission-denied" });

    await expect(adminUpdateBugReport.run(callableRequest({
      uid: adminUid,
      email: "bug-admin@example.com",
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data,
    }))).resolves.toEqual({ ok: true, reportId, status: "triaged" });
    expect((await admin.firestore().collection("bug_reports").doc(reportId).get()).data()).toMatchObject({
      status: "triaged",
      priority: "high",
      adminNote: "Reproduced on iOS.",
      handledBy: adminUid,
    });

    await admin.firestore().collection("bug_reports").doc(reportId).update({ status: "closed" });
    await expect(adminUpdateBugReport.run(callableRequest({
      uid: adminUid,
      email: "bug-admin@example.com",
      appId: STRENGTH_SAVE_IOS_APP_CHECK_ID,
      data: { reportId, status: "new" },
    }))).rejects.toMatchObject({ code: "failed-precondition" });
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
