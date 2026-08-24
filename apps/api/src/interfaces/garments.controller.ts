import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { CreateGarmentUseCase, ListAvailableGarmentsUseCase } from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { CreateGarmentDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("garments")
@Controller("garments")
export class GarmentsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post()
  async createGarment(@Body() body: CreateGarmentDto) {
    try {
      return await new CreateGarmentUseCase(this.portFactory.create()).execute(body);
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Get("available")
  @ApiQuery({ name: "userId", required: true })
  async listAvailableGarments(@Query("userId") userId: string) {
    try {
      return await new ListAvailableGarmentsUseCase(this.portFactory.create()).execute({ userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
