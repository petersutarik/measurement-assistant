import { describe, it, expect } from "vitest";
import {
  computeThreeWayDiff,
  type VersionData,
  type VersionEvent,
  type VersionParameter,
} from "./diff";

function makeEvent(
  overrides: Partial<VersionEvent> & { id: string }
): VersionEvent {
  return {
    sourceEventId: null,
    name: "event",
    description: null,
    trigger: null,
    pagePattern: null,
    category: null,
    implementationNotes: null,
    ...overrides,
  };
}

function makeParam(
  overrides: Partial<VersionParameter> & { id: string; eventId: string }
): VersionParameter {
  return {
    sourceParameterId: null,
    name: "param",
    type: "string",
    description: null,
    isRequired: false,
    exampleValue: null,
    origin: null,
    ...overrides,
  };
}

const empty: VersionData = { events: [], parameters: [] };

describe("computeThreeWayDiff", () => {
  it("returns no changes when all inputs are empty", () => {
    const result = computeThreeWayDiff({
      base: empty,
      workspace: empty,
      latest: empty,
    });
    expect(result.totalChanges).toBe(0);
    expect(result.eventDiffs).toEqual([]);
  });

  it("detects event added in latest", () => {
    const result = computeThreeWayDiff({
      base: empty,
      workspace: empty,
      latest: {
        events: [makeEvent({ id: "e1", sourceEventId: "src-1", name: "new_event" })],
        parameters: [],
      },
    });
    expect(result.addedInLatest).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("added_in_latest");
    expect(result.eventDiffs[0].latestName).toBe("new_event");
  });

  it("detects event removed in latest", () => {
    const baseEvent = makeEvent({ id: "e1", sourceEventId: "src-1", name: "old_event" });
    const wsEvent = makeEvent({ id: "e2", sourceEventId: "src-1", name: "old_event" });

    const result = computeThreeWayDiff({
      base: { events: [baseEvent], parameters: [] },
      workspace: { events: [wsEvent], parameters: [] },
      latest: empty,
    });
    expect(result.removedInLatest).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("removed_in_latest");
  });

  it("detects event modified in latest only", () => {
    const baseEvent = makeEvent({ id: "e1", sourceEventId: "src-1", name: "page_view" });
    const wsEvent = makeEvent({ id: "e2", sourceEventId: "src-1", name: "page_view" });
    const latestEvent = makeEvent({
      id: "e3",
      sourceEventId: "src-1",
      name: "page_view",
      description: "Updated description",
    });

    const result = computeThreeWayDiff({
      base: { events: [baseEvent], parameters: [] },
      workspace: { events: [wsEvent], parameters: [] },
      latest: { events: [latestEvent], parameters: [] },
    });
    expect(result.modifiedInLatest).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("modified_in_latest");
  });

  it("detects event modified in workspace only", () => {
    const baseEvent = makeEvent({ id: "e1", sourceEventId: "src-1", name: "page_view" });
    const wsEvent = makeEvent({
      id: "e2",
      sourceEventId: "src-1",
      name: "page_view",
      trigger: "On page load",
    });
    const latestEvent = makeEvent({ id: "e3", sourceEventId: "src-1", name: "page_view" });

    const result = computeThreeWayDiff({
      base: { events: [baseEvent], parameters: [] },
      workspace: { events: [wsEvent], parameters: [] },
      latest: { events: [latestEvent], parameters: [] },
    });
    expect(result.modifiedInWorkspace).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("modified_in_workspace");
  });

  it("detects conflict when both modified event", () => {
    const baseEvent = makeEvent({ id: "e1", sourceEventId: "src-1", name: "page_view" });
    const wsEvent = makeEvent({
      id: "e2",
      sourceEventId: "src-1",
      name: "page_view",
      trigger: "On page load",
    });
    const latestEvent = makeEvent({
      id: "e3",
      sourceEventId: "src-1",
      name: "page_view",
      description: "Live version desc",
    });

    const result = computeThreeWayDiff({
      base: { events: [baseEvent], parameters: [] },
      workspace: { events: [wsEvent], parameters: [] },
      latest: { events: [latestEvent], parameters: [] },
    });
    expect(result.conflicts).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("conflict");
  });

  it("detects new event in workspace (no sourceEventId)", () => {
    const result = computeThreeWayDiff({
      base: empty,
      workspace: {
        events: [makeEvent({ id: "ws-new", name: "custom_event" })],
        parameters: [],
      },
      latest: empty,
    });
    expect(result.newInWorkspace).toBe(1);
    expect(result.eventDiffs[0].changeType).toBe("new_in_workspace");
    expect(result.eventDiffs[0].workspaceName).toBe("custom_event");
  });

  it("reports unchanged events as having no diffs", () => {
    const baseEvent = makeEvent({ id: "e1", sourceEventId: "src-1", name: "page_view" });
    const wsEvent = makeEvent({ id: "e2", sourceEventId: "src-1", name: "page_view" });
    const latestEvent = makeEvent({ id: "e3", sourceEventId: "src-1", name: "page_view" });

    const result = computeThreeWayDiff({
      base: { events: [baseEvent], parameters: [] },
      workspace: { events: [wsEvent], parameters: [] },
      latest: { events: [latestEvent], parameters: [] },
    });
    expect(result.totalChanges).toBe(0);
  });

  describe("parameter-level diffs", () => {
    it("detects parameter added in latest within a matched event", () => {
      const src = "src-1";
      const baseEvent = makeEvent({ id: "e1", sourceEventId: src, name: "click" });
      const wsEvent = makeEvent({ id: "e2", sourceEventId: src, name: "click" });
      const latestEvent = makeEvent({ id: "e3", sourceEventId: src, name: "click" });

      const result = computeThreeWayDiff({
        base: { events: [baseEvent], parameters: [] },
        workspace: { events: [wsEvent], parameters: [] },
        latest: {
          events: [latestEvent],
          parameters: [
            makeParam({
              id: "p3",
              eventId: "e3",
              sourceParameterId: "src-p1",
              name: "button_text",
            }),
          ],
        },
      });
      expect(result.modifiedInLatest).toBe(1);
      const evtDiff = result.eventDiffs[0];
      expect(evtDiff.parameterDiffs).toHaveLength(1);
      expect(evtDiff.parameterDiffs[0].changeType).toBe("added_in_latest");
    });

    it("detects parameter modified in workspace", () => {
      const src = "src-1";
      const baseEvent = makeEvent({ id: "e1", sourceEventId: src, name: "click" });
      const wsEvent = makeEvent({ id: "e2", sourceEventId: src, name: "click" });
      const latestEvent = makeEvent({ id: "e3", sourceEventId: src, name: "click" });

      const baseParam = makeParam({
        id: "p1",
        eventId: "e1",
        sourceParameterId: "src-p1",
        name: "label",
      });
      const wsParam = makeParam({
        id: "p2",
        eventId: "e2",
        sourceParameterId: "src-p1",
        name: "label",
        description: "Updated in workspace",
      });
      const latestParam = makeParam({
        id: "p3",
        eventId: "e3",
        sourceParameterId: "src-p1",
        name: "label",
      });

      const result = computeThreeWayDiff({
        base: { events: [baseEvent], parameters: [baseParam] },
        workspace: { events: [wsEvent], parameters: [wsParam] },
        latest: { events: [latestEvent], parameters: [latestParam] },
      });
      expect(result.modifiedInWorkspace).toBe(1);
      expect(result.eventDiffs[0].parameterDiffs[0].changeType).toBe(
        "modified_in_workspace"
      );
    });

    it("detects parameter conflict", () => {
      const src = "src-1";
      const baseEvent = makeEvent({ id: "e1", sourceEventId: src, name: "click" });
      const wsEvent = makeEvent({ id: "e2", sourceEventId: src, name: "click" });
      const latestEvent = makeEvent({ id: "e3", sourceEventId: src, name: "click" });

      const baseParam = makeParam({
        id: "p1",
        eventId: "e1",
        sourceParameterId: "src-p1",
        name: "label",
      });
      const wsParam = makeParam({
        id: "p2",
        eventId: "e2",
        sourceParameterId: "src-p1",
        name: "label",
        description: "WS change",
      });
      const latestParam = makeParam({
        id: "p3",
        eventId: "e3",
        sourceParameterId: "src-p1",
        name: "label",
        exampleValue: "Click me",
      });

      const result = computeThreeWayDiff({
        base: { events: [baseEvent], parameters: [baseParam] },
        workspace: { events: [wsEvent], parameters: [wsParam] },
        latest: { events: [latestEvent], parameters: [latestParam] },
      });
      expect(result.conflicts).toBe(1);
      expect(result.eventDiffs[0].parameterDiffs[0].changeType).toBe("conflict");
    });

    it("detects new parameter in workspace (no sourceParameterId)", () => {
      const src = "src-1";
      const baseEvent = makeEvent({ id: "e1", sourceEventId: src, name: "click" });
      const wsEvent = makeEvent({ id: "e2", sourceEventId: src, name: "click" });
      const latestEvent = makeEvent({ id: "e3", sourceEventId: src, name: "click" });

      const result = computeThreeWayDiff({
        base: { events: [baseEvent], parameters: [] },
        workspace: {
          events: [wsEvent],
          parameters: [
            makeParam({ id: "ws-p1", eventId: "e2", name: "new_param" }),
          ],
        },
        latest: { events: [latestEvent], parameters: [] },
      });
      expect(result.modifiedInWorkspace).toBe(1);
      expect(result.eventDiffs[0].parameterDiffs[0].changeType).toBe(
        "new_in_workspace"
      );
    });
  });

  describe("mixed scenario", () => {
    it("correctly counts all change types", () => {
      const result = computeThreeWayDiff({
        base: {
          events: [
            makeEvent({ id: "e1", sourceEventId: "s1", name: "page_view" }),
            makeEvent({ id: "e2", sourceEventId: "s2", name: "click" }),
            makeEvent({ id: "e3", sourceEventId: "s3", name: "scroll" }),
            makeEvent({ id: "e4", sourceEventId: "s4", name: "video_play" }),
          ],
          parameters: [],
        },
        workspace: {
          events: [
            makeEvent({ id: "w1", sourceEventId: "s1", name: "page_view" }), // unchanged
            makeEvent({ id: "w2", sourceEventId: "s2", name: "click_updated" }), // modified in ws
            makeEvent({ id: "w3", sourceEventId: "s3", name: "scroll", trigger: "on_scroll" }), // conflict (ws changed trigger)
            // s4 (video_play) still present
            makeEvent({ id: "w4", sourceEventId: "s4", name: "video_play" }),
            makeEvent({ id: "w5", name: "custom_new" }), // new in workspace
          ],
          parameters: [],
        },
        latest: {
          events: [
            makeEvent({ id: "l1", sourceEventId: "s1", name: "page_view" }), // unchanged
            makeEvent({ id: "l2", sourceEventId: "s2", name: "click" }), // ws modified
            makeEvent({
              id: "l3",
              sourceEventId: "s3",
              name: "scroll",
              description: "modified in latest",
            }), // conflict
            // s4 removed from latest
            makeEvent({ id: "l5", sourceEventId: "s5", name: "added_event" }), // added in latest
          ],
          parameters: [],
        },
      });

      expect(result.addedInLatest).toBe(1);
      expect(result.removedInLatest).toBe(1);
      expect(result.modifiedInWorkspace).toBe(1);
      expect(result.conflicts).toBe(1);
      expect(result.newInWorkspace).toBe(1);
      expect(result.totalChanges).toBe(5);
    });
  });
});
