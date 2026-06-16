import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { Observable } from "rxjs";
import { formatLogPayload } from "./log-payload";
import { SUBQUEUE_ROUTE_KEY } from "./subqueue-route.decorator";

interface ApiRequestPayload {
  body: unknown;
  contentType?: string;
  params: unknown;
  query: unknown;
}

@Injectable()
export class ApiRequestLoggingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(ApiRequestLoggingInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const subqueue =
      this.reflector.getAllAndOverride<boolean>(SUBQUEUE_ROUTE_KEY, [context.getHandler(), context.getClass()]) ??
      false;

    this.logger.log(
      `API request endpoint=${request.method} ${request.url} subqueue=${subqueue} payload=${formatLogPayload(
        this.buildPayload(request)
      )}`
    );

    return next.handle();
  }

  private buildPayload(request: FastifyRequest): ApiRequestPayload {
    const contentType = this.getHeaderValue(request.headers["content-type"]);

    return {
      contentType,
      params: request.params,
      query: request.query,
      body: contentType?.includes("multipart/form-data") ? "[multipart/form-data stream]" : request.body
    };
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value.join("; ") : value;
  }
}
