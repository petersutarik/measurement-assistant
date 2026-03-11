import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const queryResults: unknown[] = [];

function chainMock(): Record<string, unknown> {
  const resolve = () => {
    const result = queryResults.shift();
    return Promise.resolve(result);
  };
  const self: Record<string, unknown> = {};
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
  self.then = (
    onFulfilled: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => resolve().then(onFulfilled, onRejected);
  return self;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createDbMock(): any {
  return {
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
    transaction: async (fn: (tx: ReturnType<typeof createDbMock>) => Promise<unknown>) => {
      const txMock = createDbMock();
      return fn(txMock);
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
    versionNumber: "vn",
    name: "name",
  },
  events: { id: "id", specVersionId: "svId", sortOrder: "so" },
  parameters: { id: "id", specVersionId: "svId" },
  eventParameters: { eventId: "eId", parameterId: "pId", sortOrder: "so" },
  implementationDocuments: {
    id: "id",
    projectId: "pId",
    specVersionId: "svId",
    title: "title",
    description: "desc",
    createdAt: "ca",
    createdBy: "cb",
  },
  implDocumentEvents: {
    id: "id",
    implementationDocumentId: "idId",
    eventId: "eId",
    snapshotData: "sd",
    sortOrder: "so",
  },
}));

const mockRequireUserContext = vi.fn();
vi.mock("@/lib/auth/user-context", () => ({
  requireUserContext: () => mockRequireUserContext(),
}));

const {
  getDocuments,
  getDocument,
  createDocument,
  deleteDocument,
  updateDocument,
} = await import("./actions");

// Use real UUIDs since Zod validates them
const U = {
  user: "00000000-0000-4000-8000-000000000001",
  org: "00000000-0000-4000-8000-000000000002",
  proj: "00000000-0000-4000-8000-000000000010",
  sv: "00000000-0000-4000-8000-000000000020",
  doc: "00000000-0000-4000-8000-000000000030",
  docNew: "00000000-0000-4000-8000-000000000031",
  event1: "00000000-0000-4000-8000-000000000040",
  param1: "00000000-0000-4000-8000-000000000050",
  ide1: "00000000-0000-4000-8000-000000000060",
};

const fakeContext = {
  user: { id: U.user },
  organization: { id: U.org },
  account: { id: "acc-1" },
  membership: { id: "m-1" },
};

const fakeProject = { id: U.proj, organizationId: U.org, name: "Test" };

describe("document actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
    mockRequireUserContext.mockResolvedValue(fakeContext);
  });

  describe("getDocuments", () => {
    it("returns empty array when no documents", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // docs query

      const result = await getDocuments(U.proj);
      expect(result).toEqual([]);
    });

    it("returns documents with event counts and version info", async () => {
      const fakeDoc = {
        id: U.doc,
        title: "Test Doc",
        description: null,
        specVersionId: U.sv,
        createdAt: new Date().toISOString(),
      };

      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeDoc]); // docs query
      queryResults.push([
        { implementationDocumentId: U.doc, eventCount: 3 },
      ]); // counts
      queryResults.push([
        { id: U.sv, versionNumber: 1, name: "v1" },
      ]); // versions

      const result = await getDocuments(U.proj);
      expect(result).toHaveLength(1);
      expect(result[0].eventCount).toBe(3);
      expect(result[0].specVersion?.versionNumber).toBe(1);
    });
  });

  describe("getDocument", () => {
    it("returns null when document not found", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // doc query (empty)

      const result = await getDocument(U.proj, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns document with snapshot events and version", async () => {
      const fakeDoc = {
        id: U.doc,
        title: "Test",
        description: null,
        specVersionId: U.sv,
        projectId: U.proj,
        createdBy: U.user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibleFields: null,
      };

      queryResults.push([fakeProject]); // requireProject
      queryResults.push([fakeDoc]); // doc
      queryResults.push([
        {
          id: U.ide1,
          implementationDocumentId: U.doc,
          eventId: U.event1,
          snapshotData: { event: { name: "page_view" }, parameters: [] },
          sortOrder: 0,
        },
      ]); // snapshot events
      queryResults.push([
        { id: U.sv, versionNumber: 1, name: null },
      ]); // version

      const result = await getDocument(U.proj, U.doc);
      expect(result).not.toBeNull();
      expect(result!.snapshotEvents).toHaveLength(1);
      expect(result!.specVersion?.versionNumber).toBe(1);
    });
  });

  describe("createDocument", () => {
    it("creates document with snapshot of events and params", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([{ id: U.sv, projectId: U.proj, type: "published" }]); // version
      queryResults.push([
        {
          id: U.event1,
          name: "page_view",
          description: "Page viewed",
          trigger: "pageload",
          pagePattern: null,
          category: "engagement",
          implementationNotes: null,
          exampleUrls: null,
          sortOrder: 0,
          specVersionId: U.sv,
        },
      ]); // events
      queryResults.push([
        {
          param: {
            id: U.param1,
            name: "page_title",
            type: "string",
            description: "Title of page",
            isRequired: true,
            exampleValue: "Home",
            origin: null,
            parentId: null,
            sortOrder: 0,
            specVersionId: U.sv,
            sourceParameterId: null,
          },
          eventId: U.event1,
        },
      ]); // params via junction
      queryResults.push([{ id: U.docNew }]); // tx: insert doc
      queryResults.push([]); // tx: insert snapshot

      const result = await createDocument(U.proj, {
        title: "Checkout Flow",
        specVersionId: U.sv,
        eventIds: [U.event1],
      });

      expect(result).toEqual({ id: U.docNew });
      expect(mockInsert).toHaveBeenCalled();
    });

    it("throws when no events found", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([{ id: U.sv }]); // version
      queryResults.push([]); // no events
      queryResults.push([]); // no params

      await expect(
        createDocument(U.proj, {
          title: "Empty",
          specVersionId: U.sv,
          eventIds: [U.event1],
        })
      ).rejects.toThrow("No events found");
    });
  });

  describe("deleteDocument", () => {
    it("deletes existing document", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([{ id: U.doc, projectId: U.proj }]); // existing check
      queryResults.push(undefined); // delete

      await deleteDocument(U.proj, U.doc);
      expect(mockDelete).toHaveBeenCalled();
    });

    it("throws when document not found", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // not found

      await expect(deleteDocument(U.proj, "nope")).rejects.toThrow(
        "Document not found"
      );
    });
  });

  describe("updateDocument", () => {
    it("updates title and description", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([{ id: U.doc, projectId: U.proj }]); // existing
      queryResults.push(undefined); // update

      await updateDocument(U.proj, U.doc, {
        title: "New Title",
        description: "New desc",
      });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("throws when document not found", async () => {
      queryResults.push([fakeProject]); // requireProject
      queryResults.push([]); // not found

      await expect(
        updateDocument(U.proj, "nope", { title: "X" })
      ).rejects.toThrow("Document not found");
    });
  });
});
