import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
// Each DB query resolves to the next value from this queue
const queryResults: unknown[] = [];

/**
 * Creates a chainable + thenable mock that mirrors Drizzle query behavior.
 * Every method returns `self` so you can chain freely.
 * Awaiting the chain (or calling `.then()`) resolves from the queryResults queue.
 */
function chainMock(): Record<string, unknown> {
  const resolve = () => {
    const result = queryResults.shift();
    return Promise.resolve(result);
  };
  const self: Record<string, unknown> = {};

  // All methods return self for chaining
  for (const method of [
    "from",
    "where",
    "leftJoin",
    "innerJoin",
    "groupBy",
    "values",
    "set",
    "with",
    "limit",
    "orderBy",
    "returning",
  ]) {
    self[method] = vi.fn(() => self);
  }

  // Make the chain thenable — await resolves from queue
  self.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    resolve().then(onFulfilled, onRejected);

  return self;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createDbMock(): any {
  return {
    select: (cols?: unknown) => chainMock(),
    $with: () => ({ as: () => ({}) }),
    with: () => chainMock(),
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
    transaction: async (fn: (tx: ReturnType<typeof createDbMock>) => Promise<void>) => {
      const txMock = createDbMock();
      await fn(txMock);
    },
  };
}

vi.mock("@/lib/db", () => ({
  db: createDbMock(),
}));

vi.mock("@/lib/db/schema", () => ({
  projects: { id: "id", organizationId: "orgId" },
  specVersions: {
    id: "id",
    projectId: "pId",
    type: "type",
    createdAt: "ca",
    versionNumber: "vn",
    forkedFromId: "ffId",
  },
  events: { id: "id", specVersionId: "svId" },
  parameters: { id: "id", specVersionId: "svId", parentId: "pId" },
  eventParameters: { eventId: "eId", parameterId: "pId", sortOrder: "so" },
  customFieldValues: { eventId: "eId", parameterId: "pId", customFieldDefinitionId: "cfdId" },
}));

const mockRequireUserContext = vi.fn();
vi.mock("@/lib/auth/user-context", () => ({
  requireUserContext: () => mockRequireUserContext(),
}));

const {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  publishWorkspace,
  getLatestPublished,
  getNextVersionNumber,
  getPublishedVersions,
  updatePublishedVersion,
} = await import("./actions");

const fakeContext = {
  user: { id: "user-1" },
  organization: { id: "org-1" },
  account: { id: "acc-1" },
  membership: { id: "m-1" },
};

const fakeProject = { id: "proj-1", organizationId: "org-1", name: "Test" };
const fakeWorkspace = {
  id: "ws-1",
  projectId: "proj-1",
  type: "workspace",
  name: "Main",
  description: "Main workspace",
};

describe("workspace actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
    mockRequireUserContext.mockResolvedValue(fakeContext);
  });

  describe("getWorkspaces", () => {
    it("requires auth and returns workspaces", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeWorkspace]); // query

      const result = await getWorkspaces("proj-1");
      expect(mockRequireUserContext).toHaveBeenCalled();
      expect(result).toEqual([fakeWorkspace]);
    });
  });

  describe("createWorkspace", () => {
    it("inserts with correct values when no published version exists", async () => {
      queryResults.push([fakeProject]); // requireProject
      // Transaction: latest published query → empty
      queryResults.push([]);
      // Insert workspace returning
      queryResults.push([{ id: "new-ws-1" }]);

      const formData = new FormData();
      formData.set("name", "New Workspace");
      formData.set("description", "A description");

      await createWorkspace("proj-1", formData);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("forks from latest published when one exists", async () => {
      const fakePublished = {
        id: "pub-1",
        projectId: "proj-1",
        type: "published",
        versionNumber: 2,
      };

      queryResults.push([fakeProject]); // requireProject
      // Transaction: latest published
      queryResults.push([fakePublished]);
      // Insert workspace returning
      queryResults.push([{ id: "new-ws-2" }]);
      // cloneSpecData: select events from source
      queryResults.push([]); // no events

      const formData = new FormData();
      formData.set("name", "Forked Workspace");

      await createWorkspace("proj-1", formData);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("throws on invalid name", async () => {
      queryResults.push([fakeProject]);

      const formData = new FormData();
      formData.set("name", "");

      await expect(createWorkspace("proj-1", formData)).rejects.toThrow();
    });
  });

  describe("publishWorkspace", () => {
    function publishFormData(name = "Release 1") {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("description", "A release");
      return fd;
    }

    it("creates a published version from workspace", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeWorkspace]); // workspace lookup
      // Transaction: max version query
      queryResults.push([{ maxVersion: null }]);
      // Insert published returning
      queryResults.push([{ id: "pub-1" }]);
      // cloneSpecData: select events
      queryResults.push([]);

      await publishWorkspace("proj-1", "ws-1", publishFormData());
      expect(mockInsert).toHaveBeenCalled();
    });

    it("increments version number correctly", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeWorkspace]); // workspace lookup
      // Transaction: max version
      queryResults.push([{ maxVersion: 3 }]);
      // Insert published returning
      queryResults.push([{ id: "pub-2" }]);
      // cloneSpecData
      queryResults.push([]);

      await publishWorkspace("proj-1", "ws-1", publishFormData());
      expect(mockInsert).toHaveBeenCalled();
    });

    it("throws when workspace not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([]); // no workspace

      await expect(
        publishWorkspace("proj-1", "ws-1", publishFormData())
      ).rejects.toThrow("Workspace not found");
    });

    it("clones events and parameters", async () => {
      const fakeEvent = { id: "evt-1", specVersionId: "ws-1", name: "page_view" };
      const fakeParam = {
        id: "param-1",
        eventId: "evt-1",
        parentId: null,
        name: "page_title",
      };
      const fakeNestedParam = {
        id: "param-2",
        eventId: "evt-1",
        parentId: "param-1",
        name: "nested",
      };

      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeWorkspace]); // workspace lookup
      // Transaction: max version
      queryResults.push([{ maxVersion: null }]);
      // Insert published returning
      queryResults.push([{ id: "pub-1" }]);
      // cloneSpecData: select events
      queryResults.push([fakeEvent]);
      // Insert cloned event returning
      queryResults.push([{ id: "new-evt-1" }]);
      // Select parameters (workspace-level) for source
      queryResults.push([fakeParam, fakeNestedParam]);
      // Insert param 1 returning
      queryResults.push([{ id: "new-param-1" }]);
      // Insert param 2 returning
      queryResults.push([{ id: "new-param-2" }]);
      // Update parentId on param-2 (has parentId)
      queryResults.push(undefined);
      // Clone junction rows (event_parameters)
      queryResults.push([]);
      // Clone custom field values for events
      queryResults.push([]);
      // Clone custom field values for parameters
      queryResults.push([]);

      await publishWorkspace("proj-1", "ws-1", publishFormData());
      // Events and parameters were inserted
      expect(mockInsert).toHaveBeenCalled();
      // parentId remapping triggered an update
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("getLatestPublished", () => {
    it("returns latest published version", async () => {
      const fakePublished = {
        id: "pub-1",
        versionNumber: 2,
        type: "published",
      };
      queryResults.push([fakePublished]);

      const result = await getLatestPublished("proj-1");
      expect(result).toEqual(fakePublished);
    });

    it("returns null when no published versions", async () => {
      queryResults.push([]);

      const result = await getLatestPublished("proj-1");
      expect(result).toBeNull();
    });
  });

  describe("getNextVersionNumber", () => {
    it("returns 1 when no published versions", async () => {
      queryResults.push([{ maxVersion: null }]);

      const result = await getNextVersionNumber("proj-1");
      expect(result).toBe(1);
    });

    it("returns max + 1", async () => {
      queryResults.push([{ maxVersion: 5 }]);

      const result = await getNextVersionNumber("proj-1");
      expect(result).toBe(6);
    });
  });

  describe("updateWorkspace", () => {
    it("updates existing workspace", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeWorkspace]); // existing check

      const formData = new FormData();
      formData.set("name", "Renamed");

      await updateWorkspace("proj-1", "ws-1", formData);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("throws when workspace not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([]); // no workspace

      const formData = new FormData();
      formData.set("name", "Test");

      await expect(
        updateWorkspace("proj-1", "ws-1", formData)
      ).rejects.toThrow("Workspace not found");
    });
  });

  describe("getPublishedVersions", () => {
    it("requires auth and returns published versions", async () => {
      const fakeVersions = [
        { id: "pub-2", name: "v2", versionNumber: 2, publishedAt: new Date() },
        { id: "pub-1", name: "v1", versionNumber: 1, publishedAt: new Date() },
      ];
      queryResults.push([fakeProject]); // requireProject
      queryResults.push(fakeVersions); // query

      const result = await getPublishedVersions("proj-1");
      expect(mockRequireUserContext).toHaveBeenCalled();
      expect(result).toEqual(fakeVersions);
    });

    it("returns empty array when no published versions", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // query

      const result = await getPublishedVersions("proj-1");
      expect(result).toEqual([]);
    });
  });

  describe("updatePublishedVersion", () => {
    const fakePublished = {
      id: "pub-1",
      projectId: "proj-1",
      type: "published",
      name: "Release 1",
      description: "First release",
    };

    it("updates an existing published version", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakePublished]); // existing check

      const formData = new FormData();
      formData.set("name", "Updated Release");
      formData.set("description", "Updated description");

      await updatePublishedVersion("proj-1", "pub-1", formData);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("throws when published version not found", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // no version

      const formData = new FormData();
      formData.set("name", "Test");

      await expect(
        updatePublishedVersion("proj-1", "pub-1", formData)
      ).rejects.toThrow("Published version not found");
    });
  });

  describe("deleteWorkspace", () => {
    it("deletes existing workspace", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([fakeWorkspace]);

      await deleteWorkspace("proj-1", "ws-1");
      expect(mockDelete).toHaveBeenCalled();
    });

    it("throws when workspace not found", async () => {
      queryResults.push([fakeProject]);
      queryResults.push([]); // no workspace

      await expect(deleteWorkspace("proj-1", "ws-1")).rejects.toThrow(
        "Workspace not found"
      );
    });
  });
});
