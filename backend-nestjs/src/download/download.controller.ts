import { Body, Controller, Header, HttpCode, Post, Res } from "@nestjs/common";
import { FastifyReply } from "fastify";
import { DownloadRequestDto } from "./download.dto";
import { DownloadService } from "./download.service";

@Controller("download")
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Post()
  @HttpCode(200)
  @Header("Content-Type", "text/csv; charset=utf-8")
  async download(@Body() body: DownloadRequestDto, @Res() reply: FastifyReply): Promise<void> {
    const csv = await this.downloadService.createCsvForIds(body.selectedIds, body.dataset);
    reply.header("Content-Disposition", 'attachment; filename="selected_data.csv"').send(csv);
  }
}
