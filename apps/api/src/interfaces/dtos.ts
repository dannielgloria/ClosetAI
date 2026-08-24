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
  @ApiProperty()
  @IsString()
  userId!: string;

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

export class GenerateBasicOutfitDto {
  @ApiProperty()
  @IsString()
  userId!: string;
}

export class UserScopedCommandDto {
  @ApiProperty()
  @IsString()
  userId!: string;
}

export class ConfirmOutfitUsageDto {
  @ApiProperty()
  @IsString()
  userId!: string;

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
