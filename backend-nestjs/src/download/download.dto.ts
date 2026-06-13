import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional } from "class-validator";
import { Dataset } from "../data/data.types";

export class DownloadRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  selectedIds!: number[];

  @IsOptional()
  @IsIn(["cas9", "cas12"])
  dataset?: Dataset;
}
