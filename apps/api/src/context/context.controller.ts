import { BadRequestException, Body, Controller, HttpCode, Inject, Post, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, ContextInterpretationFailedError, InterpretContextUseCase } from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { InterpretContextDto, InterpretedContextResponseDto } from "./context.dtos.js";
import { CONTEXT_INTERPRETER, ContextInterpreterProvider } from "./context-interpreter.provider.js";

@ApiTags("context")
@Controller("context")
export class ContextController {
  constructor(@Inject(CONTEXT_INTERPRETER) private readonly contextInterpreter: ContextInterpreterProvider) {}

  @Post("interpret")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Interpret natural language into structured wardrobe context." })
  @ApiOkResponse({ type: InterpretedContextResponseDto })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiServiceUnavailableResponse({ description: "AI provider unavailable or returned invalid structured output." })
  async interpret(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: InterpretContextDto): Promise<InterpretedContextResponseDto> {
    try {
      return await new InterpretContextUseCase(this.contextInterpreter).execute({
        actorUserId: currentUser.userId,
        text: body.text
      });
    } catch (error) {
      if (error instanceof ContextInterpretationFailedError) {
        throw new ServiceUnavailableException("Context interpretation is temporarily unavailable.");
      }

      throw new BadRequestException(error instanceof Error ? error.message : "Invalid context interpretation request.");
    }
  }
}
