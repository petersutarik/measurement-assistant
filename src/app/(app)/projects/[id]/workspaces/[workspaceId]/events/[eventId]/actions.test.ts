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
  events: { id: "id", specVersionId: "svId" },
  parameters: { id: "id", specVersionId: "svId" },
  eventParameters: { eventId: "eId", parameterId: "pId", sortOrder: "so" },
}));

const mockRequireUserContext = vi.fn();
vi.mock("@/lib/auth/user-context", () => ({
  requireUserContext: () => mockRequireUserContext(),
}));

const { getParameters, createParameter, updateParameter, deleteParameter } =
  await import("./actions");

const fakeContext = {
  user: { id: "user-1" },
  organization: { id: "org-1" },
  account: { id: "acc-1" },
  membership: { id: "m-1" },
};

const fakeProject = { id: "proj-1", organizationId: "org-1" };
const fakeWorkspace = { id: "ws-1", projectId: "proj-1", type: "workspace" };
const fakeEvent = { id: "ev-1", specVersionId: "ws-1", name: "purchase" };
const fakeParam = {
  id: "p-1",
  eventId: "ev-1",
  name: "currency",
  type: "string",
};

describe("parameter actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
    mockRequireUserContext.mockResolvedValue(fakeContext);
  });

  describe("getParameters", () => {
    it("requires auth and returns parameters", async () => {
      queryResults.push([fakeProject]); // requireEvent → project
      queryResults.push([fakeWorkspace]); // requireEvent → workspace
      queryResults.push([fakeEvent]); // requireEvent → event
      queryResults.push([{ param: fakeParam, sortOrder: 0 }]); // junction query → orderBy

      const result = await getParameters("proj-1", "ws-1", "ev-1");
      expect(mockRequireUserContext).toHaveBeenCalled();
      expect(result).toEqual([fakeParam]);
    });
  });

  describe("createParameter", () => {
    it("inserts valid parameter", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push([{ max: 0 }]); // max sortOrder from eventParameters
      queryResults.push([{ id: "p-new" }]); // insert parameters returning
      queryResults.push(undefined); // insert eventParameters junction

      const formData = new FormData();
      formData.set("name", "currency");
      formData.set("type", "string");
      formData.set("isRequired", "true");

      await createParameter("proj-1", "ws-1", "ev-1", formData);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("rejects invalid type", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);

      const formData = new FormData();
      formData.set("name", "x");
      formData.set("type", "integer");

      await expect(
        createParameter("proj-1", "ws-1", "ev-1", formData)
      ).rejects.toThrow();
    });

    it("throws when event not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([]); // no event

      const formData = new FormData();
      formData.set("name", "x");
      formData.set("type", "string");

      await expect(
        createParameter("proj-1", "ws-1", "ev-1", formData)
      ).rejects.toThrow("Event not found");
    });
  });

  describe("updateParameter", () => {
    it("updates existing parameter", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push([{ param: fakeParam }]); // existing check via junction innerJoin

      const formData = new FormData();
      formData.set("name", "updated");
      formData.set("type", "number");
      formData.set("isRequired", "false");

      await updateParameter("proj-1", "ws-1", "ev-1", "p-1", formData);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("throws when parameter not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push([]); // no parameter

      const formData = new FormData();
      formData.set("name", "x");
      formData.set("type", "string");
      formData.set("isRequired", "false");

      await expect(
        updateParameter("proj-1", "ws-1", "ev-1", "p-1", formData)
      ).rejects.toThrow("Parameter not found");
    });
  });

  describe("deleteParameter", () => {
    it("deletes junction row and cleans up orphaned parameter", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push([{ eventId: "ev-1", parameterId: "p-1" }]); // existing junction check
      queryResults.push(undefined); // delete from eventParameters

      const { db } = await import("@/lib/db");
      await deleteParameter("proj-1", "ws-1", "ev-1", "p-1");
      expect(mockDelete).toHaveBeenCalled();
      expect(db.execute).toHaveBeenCalled();
    });

    it("throws when parameter not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);
      queryResults.push([fakeEvent]);
      queryResults.push([]); // no junction row

      await expect(
        deleteParameter("proj-1", "ws-1", "ev-1", "p-1")
      ).rejects.toThrow("Parameter not found");
    });
  });
});
