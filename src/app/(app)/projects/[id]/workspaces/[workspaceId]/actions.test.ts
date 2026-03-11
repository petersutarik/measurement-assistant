import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const queryResults: unknown[] = [];

function chainMock(): Record<string, unknown> {
  const terminal = () => queryResults.shift();
  const self: Record<string, unknown> = {};
  for (const method of [
    "from",
    "where",
    "leftJoin",
    "innerJoin",
    "groupBy",
    "values",
    "set",
    "returning",
  ]) {
    self[method] = vi.fn(() => self);
  }
  self.limit = vi.fn(terminal);
  self.orderBy = vi.fn(terminal);
  // Make awaitable for chains that end at .where() (e.g., aggregate queries)
  self.then = (resolve: (v: unknown) => void) => resolve(terminal());
  return self;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: () => chainMock(),
    insert: (t: unknown) => {
      mockInsert(t);
      return chainMock();
    },
    update: (t: unknown) => {
      mockUpdate(t);
      return chainMock();
    },
    delete: (t: unknown) => {
      mockDelete(t);
      return chainMock();
    },
    execute: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  projects: { id: "id", organizationId: "orgId" },
  specVersions: { id: "id", projectId: "pId", type: "type" },
  events: { id: "id", specVersionId: "svId", sortOrder: "so" },
  parameters: { id: "id", specVersionId: "svId" },
  eventParameters: { eventId: "eId", parameterId: "pId", sortOrder: "so" },
}));

const mockRequireUserContext = vi.fn();
vi.mock("@/lib/auth/user-context", () => ({
  requireUserContext: () => mockRequireUserContext(),
}));

const { createEvent, updateEvent, deleteEvent } = await import("./actions");

const fakeContext = {
  user: { id: "user-1" },
  organization: { id: "org-1" },
  account: { id: "acc-1" },
  membership: { id: "m-1" },
};

const fakeProject = { id: "proj-1", organizationId: "org-1" };
const fakeWorkspace = { id: "ws-1", projectId: "proj-1", type: "workspace" };
const fakeEvent = { id: "ev-1", specVersionId: "ws-1", name: "purchase" };

describe("event actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
    mockRequireUserContext.mockResolvedValue(fakeContext);
  });

  describe("createEvent", () => {
    it("inserts valid event", async () => {
      queryResults.push([fakeProject]); // requireWorkspace → project
      queryResults.push([fakeWorkspace]); // requireWorkspace → workspace
      queryResults.push([{ max: 2 }]); // max sortOrder (terminal via limit/orderBy)
      queryResults.push([{ id: "ev-new" }]); // insert returning

      const formData = new FormData();
      formData.set("name", "add_to_cart");
      formData.set("category", "ecommerce");

      await createEvent("proj-1", "ws-1", formData);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("rejects empty name", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);

      const formData = new FormData();
      formData.set("name", "");

      await expect(createEvent("proj-1", "ws-1", formData)).rejects.toThrow();
    });

    it("throws when workspace not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([]); // no workspace

      const formData = new FormData();
      formData.set("name", "test");

      await expect(
        createEvent("proj-1", "ws-1", formData)
      ).rejects.toThrow("Workspace not found");
    });
  });

  describe("updateEvent", () => {
    it("updates existing event", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]); // existing check

      const formData = new FormData();
      formData.set("name", "updated_event");

      await updateEvent("proj-1", "ws-1", "ev-1", formData);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("throws when event not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([]); // no event

      const formData = new FormData();
      formData.set("name", "test");

      await expect(
        updateEvent("proj-1", "ws-1", "ev-1", formData)
      ).rejects.toThrow("Event not found");
    });
  });

  describe("deleteEvent", () => {
    it("deletes existing event and cleans up orphaned parameters", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push(undefined); // delete event

      const { db } = await import("@/lib/db");
      await deleteEvent("proj-1", "ws-1", "ev-1");
      expect(mockDelete).toHaveBeenCalled();
      expect(db.execute).toHaveBeenCalled();
    });

    it("throws when event not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([]); // no event

      await expect(
        deleteEvent("proj-1", "ws-1", "ev-1")
      ).rejects.toThrow("Event not found");
    });
  });
});
