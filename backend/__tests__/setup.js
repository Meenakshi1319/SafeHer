/**
 * Global mock setup for SafeHer tests.
 *
 * Mocks: firebase-admin, twilio, @google/generative-ai, dotenv.
 *
 * All mock variables are prefixed with `mock` so Jest's module-scope
 * hoisting can reference them inside jest.mock() factories.
 */

// ── Firestore mock chain ─────────────────────────────────────────────────

const mockFirestoreDoc = {
  set: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue({
    exists: true,
    id: "mock-doc-id",
    data: () => ({ name: "Mock", email: "mock@test.com" }),
  }),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  collection: jest.fn(),
};

const mockFirestoreCollection = {
  doc: jest.fn(() => mockFirestoreDoc),
  add: jest.fn().mockResolvedValue({ id: "mock-new-id" }),
  get: jest.fn().mockResolvedValue({
    empty: false,
    docs: [
      {
        id: "mock-doc-id",
        data: () => ({ name: "Mom", phone: "+911234567890", type: "family" }),
      },
    ],
  }),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

// Allow subcollection chains: collection().doc().collection()
mockFirestoreDoc.collection = jest.fn(() => mockFirestoreCollection);

const mockFirestore = jest.fn(() => mockFirestoreCollection);

// ── Firebase Admin mock ──────────────────────────────────────────────────

const mockBucket = {
  name: "mock-bucket",
  exists: jest.fn().mockResolvedValue([true]),
  upload: jest.fn().mockResolvedValue([{}]),
};

jest.mock("firebase-admin", () => ({
  apps: [{ name: "mock-app" }],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn(() => ({})) },
  firestore: jest.fn(() => ({ collection: mockFirestore })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: "test-uid-123",
      email: "test@safeher.com",
      phone_number: "+911234567890",
    }),
    revokeRefreshTokens: jest.fn().mockResolvedValue({}),
  })),
  storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })),
}));

// ── Twilio mock ──────────────────────────────────────────────────────────

jest.mock("twilio", () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: "SM_mock_sid" }),
    },
  }));
});

// ── Gemini AI mock ───────────────────────────────────────────────────────

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      startChat: jest.fn(() => ({
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: () => "Stay safe! If you feel threatened, press the SOS button.",
          },
        }),
      })),
    })),
  })),
}));

// ── dotenv mock ──────────────────────────────────────────────────────────

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

// ── Export mocks for inspection/reset ────────────────────────────────────

module.exports = {
  mockFirestore,
  mockFirestoreCollection,
  mockFirestoreDoc,
  mockBucket,
};
