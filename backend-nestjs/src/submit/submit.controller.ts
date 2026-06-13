import { Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { SubmitService } from "./submit.service";

@Controller("submit")
export class SubmitController {
  constructor(private readonly submitService: SubmitService) {}

  @Post()
  @HttpCode(200)
  async submit(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const file = await request.file();

    if (!file) {
      reply.status(400).send({ message: "File and metadata are required." });
      return;
    }

    const response = await this.submitService.saveSubmission(file);

    if (!response) {
      reply.status(400).send({ message: "File and metadata are required." });
      return;
    }

    reply.status(200).send(response);
  }
}
