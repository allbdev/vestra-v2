import { IsString, MinLength, MaxLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}
