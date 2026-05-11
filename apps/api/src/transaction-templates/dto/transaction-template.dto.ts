import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Frequency } from "@vestra/types";

export class CreateTransactionTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount!: number;

  @IsUUID()
  categoryId!: string;

  @IsEnum(Frequency)
  frequency!: Frequency;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateTransactionTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
