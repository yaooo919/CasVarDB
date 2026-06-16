import { FastifyRequest } from "fastify";

export function getClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwardedIp = forwardedValue?.split(",")[0]?.trim();

  return firstForwardedIp || request.ip || "unknown";
}
