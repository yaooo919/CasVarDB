import { Controller, Get, Query } from "@nestjs/common";
import { GrnaQuery, GrnaService } from "./grna.service";

@Controller("grna")
export class GrnaController {
  constructor(private readonly grnaService: GrnaService) {}

  @Get()
  list(@Query() query: GrnaQuery): Promise<Record<string, unknown>[]> {
    return this.grnaService.list(query);
  }
}
