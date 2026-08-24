import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { GarmentCategory, GarmentStatus } from "@closet-ai/domain";

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

export class ConfirmOutfitUsageResponseDto {
  @ApiProperty({ type: OutfitResponseDto })
  outfit!: OutfitResponseDto;

  @ApiProperty({ type: [GarmentUsageEventResponseDto] })
  usageEvents!: GarmentUsageEventResponseDto[];
}
