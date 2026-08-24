import { EntityId, InterpretedContext, parseInterpretedContext } from "@closet-ai/domain";

export interface ContextInterpreterPort {
  interpret(input: { text: string }): Promise<InterpretedContext>;
}

export class ContextInterpretationFailedError extends Error {
  constructor(message = "Context interpretation failed.") {
    super(message);
    this.name = "ContextInterpretationFailedError";
  }
}

export class InterpretContextUseCase {
  constructor(private readonly contextInterpreter: ContextInterpreterPort) {}

  async execute(input: { actorUserId: EntityId; text: string }): Promise<InterpretedContext> {
    if (input.actorUserId.trim().length === 0) {
      throw new Error("Authenticated user is required.");
    }

    const text = input.text.trim();
    if (text.length === 0) {
      throw new Error("Text is required.");
    }

    if (text.length > 2000) {
      throw new Error("Text is too long.");
    }

    try {
      return parseInterpretedContext(await this.contextInterpreter.interpret({ text }));
    } catch (error) {
      if (error instanceof ContextInterpretationFailedError) {
        throw error;
      }

      throw new ContextInterpretationFailedError();
    }
  }
}
