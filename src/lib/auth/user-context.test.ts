import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (no-op in tests)
vi.mock("server-only", () => ({}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock Supabase
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Mock DB
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        mockFrom(table);
        return {
          where: () => ({
            limit: () => mockLimit(),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: "users",
  accounts: "accounts",
  organizations: "organizations",
  accountMembers: "accountMembers",
}));

// Import after mocks
const { getUserContext, requireUserContext } = await import(
  "./user-context"
);

describe("getUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no auth user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getUserContext();
    expect(result).toBeNull();
  });

  it("returns null when no app user row", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockLimit.mockResolvedValueOnce([]); // no user row
    const result = await getUserContext();
    expect(result).toBeNull();
  });

  it("returns null when no membership", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockLimit
      .mockResolvedValueOnce([{ id: "user-1", email: "a@b.com" }]) // user
      .mockResolvedValueOnce([]); // no membership
    const result = await getUserContext();
    expect(result).toBeNull();
  });

  it("returns full context when all entities exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const user = { id: "user-1", email: "a@b.com" };
    const membership = { id: "m-1", accountId: "acc-1", userId: "user-1" };
    const account = { id: "acc-1", name: "Test" };
    const org = { id: "org-1", accountId: "acc-1", name: "Org" };
    mockLimit
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([membership])
      .mockResolvedValueOnce([account])
      .mockResolvedValueOnce([org]);

    const result = await getUserContext();
    expect(result).toEqual({ user, account, organization: org, membership });
  });
});

describe("requireUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /onboarding when context is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireUserContext()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });
});
