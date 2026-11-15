import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  CategoryType,
  Frequency,
  WORKSPACE_EXPORT_FORMAT,
  WORKSPACE_EXPORT_VERSION,
} from "@vestra/types";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DAY_MSG = "must be a YYYY-MM-DD date";

export const IMPORT_LIMITS = {
  categories: 1_000,
  templates: 5_000,
  transactions: 50_000,
} as const;

class ImportWorkspaceMetaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

class ImportCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsHexColor()
  @MaxLength(7)
  color!: string | null;
}

class ImportTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId!: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  baseAmount!: number;

  @IsOptional()
  @IsEnum(Frequency)
  frequency!: Frequency | null;

  @Matches(ISO_DAY, { message: `startDate ${ISO_DAY_MSG}` })
  startDate!: string;

  @IsBoolean()
  active!: boolean;
}

class ImportTransactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId!: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  amount!: number;

  @Matches(ISO_DAY, { message: `date ${ISO_DAY_MSG}` })
  date!: string;

  @IsBoolean()
  isPaid!: boolean;

  @IsOptional()
  @IsDateString()
  paidAt!: string | null;
}

/** Mirrors `WorkspaceExportFile` from @vestra/types. */
export class ImportWorkspaceDto {
  @Equals(WORKSPACE_EXPORT_FORMAT, { message: "Not a Vestra workspace export file" })
  format!: typeof WORKSPACE_EXPORT_FORMAT;

  @Equals(WORKSPACE_EXPORT_VERSION, { message: "Unsupported export file version" })
  version!: typeof WORKSPACE_EXPORT_VERSION;

  @IsOptional()
  @IsDateString()
  exportedAt?: string;

  @ValidateNested()
  @Type(() => ImportWorkspaceMetaDto)
  workspace!: ImportWorkspaceMetaDto;

  @IsArray()
  @ArrayMaxSize(IMPORT_LIMITS.categories)
  @ValidateNested({ each: true })
  @Type(() => ImportCategoryDto)
  categories!: ImportCategoryDto[];

  @IsArray()
  @ArrayMaxSize(IMPORT_LIMITS.templates)
  @ValidateNested({ each: true })
  @Type(() => ImportTemplateDto)
  templates!: ImportTemplateDto[];

  @IsArray()
  @ArrayMaxSize(IMPORT_LIMITS.transactions)
  @ValidateNested({ each: true })
  @Type(() => ImportTransactionDto)
  transactions!: ImportTransactionDto[];
}
