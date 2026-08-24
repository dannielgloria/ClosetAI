import { describe, expect, it } from "vitest";
import { ActivityType, InterpretedContext } from "@closet-ai/domain";
import { ContextInterpretationFailedError, ContextInterpreterPort, InterpretContextUseCase } from "./context.js";

class FakeContextInterpreter implements ContextInterpreterPort {
  constructor(private readonly result: InterpretedContext | Error) {}

  async interpret(): Promise<InterpretedContext> {
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

describe("InterpretContextUseCase", () => {
  it("returns one valid activity", async () => {
    const result = await interpret({
      activities: [{ type: ActivityType.GYM, time: null }]
    });

    expect(result.activities).toEqual([{ type: ActivityType.GYM, time: null }]);
  });

  it("returns multiple valid activities", async () => {
    const result = await interpret({
      activities: [
        { type: ActivityType.GYM, time: "17:00" },
        { type: ActivityType.CASUAL_DINNER, time: null }
      ]
    });

    expect(result.activities).toHaveLength(2);
  });

  it("keeps explicit normalized time", async () => {
    const result = await interpret({
      activities: [{ type: ActivityType.GYM, time: "17:00" }]
    });

    expect(result.activities[0]?.time).toBe("17:00");
  });

  it("keeps absent time as null", async () => {
    const result = await interpret({
      activities: [{ type: ActivityType.CASUAL_DINNER, time: null }]
    });

    expect(result.activities[0]?.time).toBeNull();
  });

  it("accepts only known activity enums", async () => {
    await expect(interpret({ activities: [{ type: "MOONWALK", time: null }] } as unknown as InterpretedContext)).rejects.toThrow(
      ContextInterpretationFailedError
    );
  });

  it("rejects invalid provider output", async () => {
    await expect(interpret({ activities: [{ type: ActivityType.GYM, time: "5pm" }] } as unknown as InterpretedContext)).rejects.toThrow(
      ContextInterpretationFailedError
    );
  });

  it("propagates provider failures as a controlled error", async () => {
    const useCase = new InterpretContextUseCase(new FakeContextInterpreter(new Error("provider failed")));

    await expect(useCase.execute({ actorUserId: "user-1", text: "Hoy voy al gimnasio." })).rejects.toThrow(ContextInterpretationFailedError);
  });
});

function interpret(result: InterpretedContext): Promise<InterpretedContext> {
  return new InterpretContextUseCase(new FakeContextInterpreter(result)).execute({ actorUserId: "user-1", text: "Hoy voy al gimnasio." });
}
