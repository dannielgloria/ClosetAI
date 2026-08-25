import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  AnalyzeGarmentImageUseCase,
  AuthenticatedUser,
  GarmentAnalysisFailedError,
  GetGarmentImageUseCase,
  GarmentThumbnailQueuePort,
  UploadGarmentImageUseCase
} from "@closet-ai/application";
import { Response } from "express";
import { AI_CONFIG } from "../ai/openai-responses-client.js";
import { AiConfig } from "../ai/ai-config.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GARMENT_ANALYZER, GarmentAnalyzerProvider } from "../garment-analyzer/garment-analyzer.provider.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { GARMENT_IMAGE_JOBS } from "../storage/garment-image-jobs.provider.js";
import { OBJECT_STORAGE, ObjectStorageProvider } from "../storage/object-storage.provider.js";
import { GarmentAnalysisResponseDto, GarmentImageUploadResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

type UploadedGarmentFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@ApiTags("garment-images")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("garment-images")
export class GarmentImagesController {
  constructor(
    private readonly portFactory: ApplicationPortFactory,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStorageProvider,
    @Inject(GARMENT_IMAGE_JOBS) private readonly garmentImageJobs: GarmentThumbnailQueuePort,
    @Inject(GARMENT_ANALYZER) private readonly garmentAnalyzer: GarmentAnalyzerProvider,
    @Inject(AI_CONFIG) private readonly aiConfig: AiConfig
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Upload a private garment image." })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["image"],
      properties: {
        image: {
          type: "string",
          format: "binary"
        }
      }
    }
  })
  @ApiCreatedResponse({ type: GarmentImageUploadResponseDto })
  @ApiBadRequestResponse({ description: "Missing, unsupported, empty, or oversized image." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async uploadImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile() file: UploadedGarmentFile | undefined
  ): Promise<GarmentImageUploadResponseDto> {
    try {
      const image = await new UploadGarmentImageUseCase(
        this.portFactory.create(),
        this.objectStorage,
        {
          maxSizeBytes: this.aiConfig.garmentImageMaxSizeBytes
        },
        this.garmentImageJobs
      ).execute({
        userId: currentUser.userId,
        content: file?.buffer ?? new Uint8Array(),
        mimeType: file?.mimetype ?? ""
      });

      return { id: image.id, status: "UPLOADED" };
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post(":imageId/analyze")
  @HttpCode(200)
  @ApiOperation({ summary: "Analyze a private garment image and return proposed metadata." })
  @ApiOkResponse({ type: GarmentAnalysisResponseDto })
  @ApiBadRequestResponse({ description: "Invalid provider output." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiForbiddenResponse({ description: "Garment image belongs to a different user." })
  @ApiNotFoundResponse({ description: "Garment image not found." })
  @ApiServiceUnavailableResponse({ description: "AI provider unavailable." })
  async analyzeImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("imageId") imageId: string
  ): Promise<GarmentAnalysisResponseDto> {
    try {
      return await new AnalyzeGarmentImageUseCase(this.portFactory.create(), this.objectStorage, this.garmentAnalyzer).execute({
        userId: currentUser.userId,
        imageId
      });
    } catch (error) {
      if (error instanceof GarmentAnalysisFailedError) {
        throw new ServiceUnavailableException("Garment analysis is unavailable.");
      }

      mapUseCaseError(error);
    }
  }

  @Get(":imageId")
  @ApiOperation({ summary: "Fetch a private garment image." })
  @ApiQuery({ name: "variant", required: false, enum: ["original", "thumbnail"] })
  @ApiProduces("image/jpeg", "image/png", "image/webp")
  @ApiOkResponse({ description: "Image bytes." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiForbiddenResponse({ description: "Garment image belongs to a different user." })
  @ApiNotFoundResponse({ description: "Garment image not found." })
  async getImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("imageId") imageId: string,
    @Query("variant") variant: string | undefined,
    @Res() response: Response
  ): Promise<void> {
    try {
      const image = await new GetGarmentImageUseCase(this.portFactory.create(), this.objectStorage).execute({
        userId: currentUser.userId,
        imageId,
        variant: variant === "thumbnail" ? "thumbnail" : "original"
      });
      response.contentType(image.mimeType);
      response.send(Buffer.from(image.data));
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
