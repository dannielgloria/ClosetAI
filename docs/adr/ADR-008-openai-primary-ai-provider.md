# ADR-008 OpenAI Primary AI Provider

## Status

Accepted

## Context

The project definition and technology assessment approve OpenAI as Closet AI's primary AI provider for LLM, Vision, structured reasoning, garment analysis, outfit styling, natural-language interpretation, and image generation. AI must interpret and propose derived artifacts, but PostgreSQL and the application/domain rules remain the source of truth.

AI Slice 1 introduces the first production OpenAI integration for natural-language context interpretation only. It must not select garments, generate outfits, generate images, or modify domain state.

## Decision

Use OpenAI behind semantic application ports.

For natural-language context interpretation:

- expose `ContextInterpreterPort`;
- implement `OpenAIContextInterpreterAdapter`;
- call OpenAI through the official Node/TypeScript SDK;
- use the Responses API for new AI capabilities;
- request structured JSON output with an explicit schema;
- validate all provider output again in the backend domain/application boundary;
- configure `OPENAI_API_KEY`, `AI_CONTEXT_MODEL`, and `AI_REQUEST_TIMEOUT_MS` through environment variables;
- version prompts under `prompts/`;
- do not persist interpreted context in PostgreSQL until a domain requirement exists;
- do not call OpenAI from controllers, domain code, or Prisma repositories;
- do not include real OpenAI calls in normal unit or integration test suites.

For outfit styling, OpenAI may rank and compose outfits only from backend-supplied eligible garment candidates. The application must validate every returned garment ID and persist only valid recommendations.

For garment analysis, OpenAI Vision may propose garment metadata only. The
application must validate the structured output and the user must confirm or
edit the proposal before a `Garment` is created. Uploaded images remain private
objects owned by the authenticated user.

## Alternatives Considered

- A generic `AIService.generate(prompt)` abstraction.
- LangChain, LlamaIndex, Semantic Kernel, or an agent framework.
- Persisting every context interpretation immediately.
- Heuristic-only natural-language parsing.

## Consequences

- AI remains replaceable at the adapter boundary.
- The endpoint can provide useful structured context without giving AI authority over wardrobe state.
- Normal CI/test runs remain deterministic and cost-free.
- Prompt changes are reviewable.

## Risks

- Provider outages make the context interpretation endpoint unavailable until a fallback strategy is approved.
- Model behavior can still drift, so strict schema output plus post-validation is required.
- Costs depend on the configured model and prompt/input size; real-provider evaluation should remain opt-in if added.
