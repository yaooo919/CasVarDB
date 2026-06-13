import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { GrnaController } from "./grna.controller";
import { GrnaService } from "./grna.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GrnaController],
  providers: [GrnaService]
})
export class GrnaModule {}
