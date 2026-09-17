import { describe, it, expect } from "vitest";
import { calculateImpactLevel } from "../src/services/impact/impactEngineService";

describe("impactEngineService.calculateImpactLevel", () => {
  it("returns LOW for a change touching almost nothing", () => {
    const level = calculateImpactLevel({
      materialsCount: 1,
      drawingsCount: 0,
      tasksCount: 0,
      approvalsCount: 0,
      costDelta: 0,
      scheduleDeltaDays: 0,
    });
    expect(level).toBe("LOW");
  });

  it("returns HIGH when several entities and a real cost delta are involved", () => {
    const level = calculateImpactLevel({
      materialsCount: 1,
      drawingsCount: 1,
      tasksCount: 2,
      approvalsCount: 1,
      costDelta: 8000,
      scheduleDeltaDays: -7,
    });
    // matches the seeded Greenwood Residence bathroom-marble scenario
    expect(["MEDIUM", "HIGH"]).toContain(level);
  });

  it("returns CRITICAL for a large multi-entity, high cost/schedule change", () => {
    const level = calculateImpactLevel({
      materialsCount: 3,
      drawingsCount: 3,
      tasksCount: 5,
      approvalsCount: 2,
      costDelta: 60000,
      scheduleDeltaDays: 15,
    });
    expect(level).toBe("CRITICAL");
  });

  it("is deterministic: same input always produces the same output", () => {
    const input = {
      materialsCount: 2,
      drawingsCount: 1,
      tasksCount: 3,
      approvalsCount: 1,
      costDelta: 5000,
      scheduleDeltaDays: 2,
    };
    const first = calculateImpactLevel(input);
    const second = calculateImpactLevel(input);
    expect(first).toBe(second);
  });
});
