import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @MinLength(1)
  message!: string;
}
