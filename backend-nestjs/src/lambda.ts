import "reflect-metadata";
import awsLambdaFastify from "@fastify/aws-lambda";
import multipart from "@fastify/multipart";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { AppModule } from "./app.module";

type LambdaProxy = (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;

let proxyPromise: Promise<LambdaProxy> | undefined;

async function getProxy(): Promise<LambdaProxy> {
  proxyPromise ??= (async () => {
    const adapter = new FastifyAdapter();
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);
    await app.register(multipart);
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true
      })
    );
    await app.init();
    return awsLambdaFastify(adapter.getInstance());
  })();

  return proxyPromise;
}

export async function handler(event: APIGatewayProxyEventV2, context: Context): Promise<unknown> {
  const proxy = await getProxy();
  return proxy(event, context);
}
