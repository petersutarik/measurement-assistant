import { describe, it, expect } from "vitest";
import { reconcile, type ExistingState } from "./reconciler";
import type { DesiredGtmState } from "./types";

const emptyExisting: ExistingState = {
  folders: [],
  variables: [],
  triggers: [],
  tags: [],
};

const desiredState: DesiredGtmState = {
  folderName: "[MA] Measurement Assistant",
  variables: [
    {
      name: "[MA] dlv - transaction_id",
      type: "v",
      config: [
        { type: "INTEGER", key: "dataLayerVersion", value: "2" },
        { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
        { type: "TEMPLATE", key: "name", value: "transaction_id" },
      ],
    },
    {
      name: "[MA] const - GA4 Measurement ID",
      type: "c",
      config: [{ type: "TEMPLATE", key: "value", value: "G-TEST123" }],
    },
  ],
  triggers: [
    {
      name: "[MA] ce - purchase",
      type: "CUSTOM_EVENT",
      config: {
        customEventFilter: [
          {
            type: "EQUALS",
            parameter: [
              { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
              { type: "TEMPLATE", key: "arg1", value: "purchase" },
            ],
          },
        ],
      },
    },
  ],
  tags: [
    {
      name: "[MA] GA4 Config - G-TEST123",
      type: "gaawc",
      config: [
        {
          type: "TEMPLATE",
          key: "measurementId",
          value: "{{[MA] const - GA4 Measurement ID}}",
        },
      ],
      firingTriggerNames: ["All Pages"],
    },
    {
      name: "[MA] GA4 - purchase",
      type: "gaawe",
      config: [
        { type: "TEMPLATE", key: "eventName", value: "purchase" },
      ],
      firingTriggerNames: ["[MA] ce - purchase"],
      configTagName: "[MA] GA4 Config - G-TEST123",
    },
  ],
};

describe("reconcile", () => {
  it("marks everything as create when workspace is empty", () => {
    const changeset = reconcile(desiredState, emptyExisting);

    expect(changeset.folder.action).toBe("create");
    expect(changeset.variables.every((v) => v.action === "create")).toBe(
      true,
    );
    expect(changeset.triggers.every((t) => t.action === "create")).toBe(
      true,
    );
    expect(changeset.tags.every((t) => t.action === "create")).toBe(true);
  });

  it("skips existing folder", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      folders: [
        {
          folderId: "1",
          name: "[MA] Measurement Assistant",
          accountId: "a",
          containerId: "c",
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);
    expect(changeset.folder.action).toBe("skip");
  });

  it("skips variables with matching config", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      variables: [
        {
          variableId: "v1",
          name: "[MA] dlv - transaction_id",
          type: "v",
          parameter: [
            { type: "INTEGER", key: "dataLayerVersion", value: "2" },
            { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
            { type: "TEMPLATE", key: "name", value: "transaction_id" },
          ],
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);

    const txnVar = changeset.variables.find(
      (v) => v.name === "[MA] dlv - transaction_id",
    );
    expect(txnVar?.action).toBe("skip");

    const constVar = changeset.variables.find(
      (v) => v.name === "[MA] const - GA4 Measurement ID",
    );
    expect(constVar?.action).toBe("create");
  });

  it("marks variable for update when config differs", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      variables: [
        {
          variableId: "v1",
          name: "[MA] dlv - transaction_id",
          type: "v",
          parameter: [
            { type: "INTEGER", key: "dataLayerVersion", value: "1" }, // different
            { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
            { type: "TEMPLATE", key: "name", value: "transaction_id" },
          ],
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);
    const txnVar = changeset.variables.find(
      (v) => v.name === "[MA] dlv - transaction_id",
    );
    expect(txnVar?.action).toBe("update");
  });

  it("skips existing triggers", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      triggers: [
        {
          triggerId: "t1",
          name: "[MA] ce - purchase",
          type: "CUSTOM_EVENT",
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);
    const trigger = changeset.triggers.find(
      (t) => t.name === "[MA] ce - purchase",
    );
    expect(trigger?.action).toBe("skip");
  });

  it("ignores non-[MA] resources", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      variables: [
        {
          variableId: "v1",
          name: "DLV - transaction_id",
          type: "v",
          parameter: [],
        },
      ],
      triggers: [
        {
          triggerId: "t1",
          name: "CE - purchase",
          type: "CUSTOM_EVENT",
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);

    // Should still create [MA] versions
    expect(
      changeset.variables.every((v) => v.action === "create"),
    ).toBe(true);
    expect(
      changeset.triggers.every((t) => t.action === "create"),
    ).toBe(true);
  });

  it("skips GA4 Config tag when non-[MA] config tag has same measurement ID", () => {
    const existing: ExistingState = {
      ...emptyExisting,
      tags: [
        {
          tagId: "t1",
          name: "GA4 Configuration",
          type: "gaawc",
          parameter: [
            {
              type: "TEMPLATE",
              key: "measurementId",
              value: "{{[MA] const - GA4 Measurement ID}}",
            },
          ],
          firingTriggerId: ["1"],
        },
      ],
    };

    const changeset = reconcile(desiredState, existing);
    const configTag = changeset.tags.find(
      (t) => t.name === "[MA] GA4 Config - G-TEST123",
    );
    expect(configTag?.action).toBe("skip");
    expect(configTag?.reason).toContain("GA4 Configuration");
  });
});
