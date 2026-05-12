import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class PusherAuthDto {
  @IsString()
  socket_id!: string;

  @IsString()
  channel_name!: string;
}

export class WorkspacePrefDto {
  @IsBoolean()
  muted!: boolean;
}

export class PushSubscribeDto {
  @IsString()
  endpoint!: string;

  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
