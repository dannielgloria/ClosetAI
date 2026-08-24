import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";
import {
  ActivityType,
  GarmentCategory,
  GarmentFit,
  GarmentMaterial,
  GarmentPattern,
  GarmentStateTransitionType,
  GarmentStatus,
  GarmentSubcategory,
  OutfitFeedbackDecision
} from "@closet-ai/domain";

export class CreateHouseholdDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  initialUserDisplayName!: string;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  displayName!: string;
}

export class CreateGarmentDto {
  @ApiProperty({ enum: GarmentCategory })
  @IsEnum(GarmentCategory)
  category!: GarmentCategory;

  @ApiProperty()
  @IsString()
  primaryColor!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryColors?: string[];

  @ApiPropertyOptional({ enum: GarmentSubcategory, nullable: true })
  @IsOptional()
  @IsEnum(GarmentSubcategory)
  subcategory?: GarmentSubcategory | null;

  @ApiPropertyOptional({ enum: GarmentPattern, nullable: true })
  @IsOptional()
  @IsEnum(GarmentPattern)
  pattern?: GarmentPattern | null;

  @ApiPropertyOptional({ enum: GarmentFit, nullable: true })
  @IsOptional()
  @IsEnum(GarmentFit)
  fit?: GarmentFit | null;

  @ApiPropertyOptional({ enum: GarmentMaterial, nullable: true })
  @IsOptional()
  @IsEnum(GarmentMaterial)
  estimatedMaterial?: GarmentMaterial | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  formality?: number | null;

  @ApiPropertyOptional({ enum: GarmentStatus })
  @IsOptional()
  @IsEnum(GarmentStatus)
  status?: GarmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageId?: string;
}

export class UpdateGarmentDto {
  @ApiPropertyOptional({ enum: GarmentCategory })
  @IsOptional()
  @IsEnum(GarmentCategory)
  category?: GarmentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryColors?: string[];

  @ApiPropertyOptional({ enum: GarmentSubcategory, nullable: true })
  @IsOptional()
  @IsEnum(GarmentSubcategory)
  subcategory?: GarmentSubcategory | null;

  @ApiPropertyOptional({ enum: GarmentPattern, nullable: true })
  @IsOptional()
  @IsEnum(GarmentPattern)
  pattern?: GarmentPattern | null;

  @ApiPropertyOptional({ enum: GarmentFit, nullable: true })
  @IsOptional()
  @IsEnum(GarmentFit)
  fit?: GarmentFit | null;

  @ApiPropertyOptional({ enum: GarmentMaterial, nullable: true })
  @IsOptional()
  @IsEnum(GarmentMaterial)
  estimatedMaterial?: GarmentMaterial | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  formality?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string | null;
}

export class TransitionGarmentStateDto {
  @ApiProperty({ enum: GarmentStateTransitionType })
  @IsEnum(GarmentStateTransitionType)
  transition!: GarmentStateTransitionType;
}

export class ConfirmOutfitUsageDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wornGarmentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class SubmitOutfitFeedbackDto {
  @ApiProperty({ enum: OutfitFeedbackDecision })
  @IsEnum(OutfitFeedbackDecision)
  decision!: OutfitFeedbackDecision;

  @ApiPropertyOptional({ maxLength: 500, example: "Too formal" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ActivityContextDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type!: ActivityType;

  @ApiProperty({ nullable: true, example: "20:00" })
  @IsOptional()
  @IsString()
  time!: string | null;
}

export class InterpretedContextDto {
  @ApiProperty({ type: [ActivityContextDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityContextDto)
  activities!: ActivityContextDto[];
}

export class GenerateOutfitRecommendationsDto {
  @ApiPropertyOptional({ type: InterpretedContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InterpretedContextDto)
  context?: InterpretedContextDto;
}

export class HouseholdResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  householdId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty({ nullable: true })
  latitude!: number | null;

  @ApiProperty({ nullable: true })
  longitude!: number | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CreateHouseholdResponseDto {
  @ApiProperty({ type: HouseholdResponseDto })
  household!: HouseholdResponseDto;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class GarmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: GarmentCategory })
  category!: GarmentCategory;

  @ApiProperty()
  primaryColor!: string;

  @ApiProperty({ type: [String] })
  secondaryColors!: string[];

  @ApiProperty({ enum: GarmentSubcategory, nullable: true })
  subcategory!: GarmentSubcategory | null;

  @ApiProperty({ enum: GarmentPattern, nullable: true })
  pattern!: GarmentPattern | null;

  @ApiProperty({ enum: GarmentFit, nullable: true })
  fit!: GarmentFit | null;

  @ApiProperty({ enum: GarmentMaterial, nullable: true })
  estimatedMaterial!: GarmentMaterial | null;

  @ApiProperty({ nullable: true })
  formality!: number | null;

  @ApiProperty({ enum: GarmentStatus })
  status!: GarmentStatus;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  imageId?: string;

  @ApiProperty()
  wearCount!: number;

  @ApiProperty({ nullable: true })
  lastWornAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class GarmentImageUploadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["UPLOADED"] })
  status!: "UPLOADED";
}

export class GarmentAnalysisResponseDto {
  @ApiProperty({ enum: GarmentCategory })
  category!: GarmentCategory;

  @ApiProperty({ enum: GarmentSubcategory, nullable: true })
  subcategory!: GarmentSubcategory | null;

  @ApiProperty()
  primaryColor!: string;

  @ApiProperty({ type: [String] })
  secondaryColors!: string[];

  @ApiProperty({ enum: GarmentPattern, nullable: true })
  pattern!: GarmentPattern | null;

  @ApiProperty({ enum: GarmentFit, nullable: true })
  fit!: GarmentFit | null;

  @ApiProperty({ enum: GarmentMaterial, nullable: true })
  estimatedMaterial!: GarmentMaterial | null;

  @ApiProperty({ nullable: true, minimum: 1, maximum: 5 })
  formality!: number | null;
}

export class OutfitItemResponseDto {
  @ApiProperty()
  garmentId!: string;

  @ApiProperty()
  position!: number;
}

export class OutfitResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [OutfitItemResponseDto] })
  items!: OutfitItemResponseDto[];

  @ApiProperty()
  explanation!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty({ nullable: true })
  selectedAt!: Date | null;

  @ApiProperty({ nullable: true })
  wornAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class GarmentUsageEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  garmentId!: string;

  @ApiProperty()
  outfitId!: string;

  @ApiProperty()
  wornAt!: Date;

  @ApiProperty()
  context!: Record<string, unknown>;
}

export class OutfitFeedbackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  outfitId!: string;

  @ApiProperty({ enum: OutfitFeedbackDecision })
  decision!: OutfitFeedbackDecision;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ConfirmOutfitUsageResponseDto {
  @ApiProperty({ type: OutfitResponseDto })
  outfit!: OutfitResponseDto;

  @ApiProperty({ type: [GarmentUsageEventResponseDto] })
  usageEvents!: GarmentUsageEventResponseDto[];
}

export class GenerateOutfitRecommendationsResponseDto {
  @ApiProperty({ enum: ["AI", "DETERMINISTIC_FALLBACK"] })
  strategy!: string;

  @ApiProperty({ enum: ["AVAILABLE", "UNAVAILABLE", "NOT_CONFIGURED"] })
  weatherStatus!: string;

  @ApiProperty({ type: () => WeatherContextResponseDto, nullable: true })
  weather!: WeatherContextResponseDto | null;

  @ApiProperty({ type: [OutfitResponseDto] })
  recommendations!: OutfitResponseDto[];
}

export class UpdateUserLocationDto {
  @ApiProperty({ example: "Ciudad de Mexico" })
  @IsString()
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 19.4326, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -99.1332, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ example: "America/Mexico_City" })
  @IsString()
  @MaxLength(80)
  timezone!: string;
}

export class UserLocationResponseDto {
  @ApiProperty()
  city!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiProperty()
  timezone!: string;
}

export class WeatherContextResponseDto {
  @ApiProperty()
  temperature!: number;

  @ApiProperty()
  apparentTemperature!: number;

  @ApiProperty()
  minTemperature!: number;

  @ApiProperty()
  maxTemperature!: number;

  @ApiProperty()
  rainProbability!: number;

  @ApiProperty()
  windSpeed!: number;

  @ApiProperty()
  humidity!: number;
}
