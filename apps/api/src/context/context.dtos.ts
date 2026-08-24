import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import { ActivityType } from "@closet-ai/domain";

export class InterpretContextDto {
  @ApiProperty({ example: "Hoy voy al gimnasio a las cinco y despues a cenar." })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

export class ActivityContextResponseDto {
  @ApiProperty({ enum: ActivityType })
  type!: ActivityType;

  @ApiProperty({ nullable: true, example: "17:00" })
  time!: string | null;
}

export class InterpretedContextResponseDto {
  @ApiProperty({ type: [ActivityContextResponseDto] })
  activities!: ActivityContextResponseDto[];
}
