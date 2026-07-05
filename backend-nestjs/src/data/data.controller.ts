import { Controller, Get, Query } from "@nestjs/common";
import { DataCompatResult, DataListResult, DataQuery } from "./data.types";
import { DataService } from "./data.service";

@Controller("data")
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  async listDefault(@Query() query: DataQuery): Promise<DataCompatResult> {
    return this.dataService.list("cas9", query);
  }

  @Get("cas9")
  async listCas9(@Query() query: DataQuery): Promise<DataListResult> {
    const result = await this.dataService.list("cas9", query);
    return { data: result.data, count: result.count };
  }

  @Get("cas12")
  async listCas12(@Query() query: DataQuery): Promise<DataListResult> {
    const result = await this.dataService.list("cas12", query);
    return { data: result.data, count: result.count };
  }
}
