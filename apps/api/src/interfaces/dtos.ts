import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { ActivityType, GarmentCategory, GarmentStatus, OutfitFeedbackDecision } from "@closet-ai/domain";

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

  @ApiPropertyOptional({ enum: GarmentStatus })
  @IsOptional()
  @IsEnum(GarmentStatus)
  status?: GarmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
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

  @ApiProperty({ enum: GarmentStatus })
  status!: GarmentStatus;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  wearCount!: number;

  @ApiProperty({ nullable: true })
  lastWornAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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

  @ApiProperty({ type: [OutfitResponseDto] })
  recommendations!: OutfitResponseDto[];
}
