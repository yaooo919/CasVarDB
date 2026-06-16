import { SetMetadata } from "@nestjs/common";

export const SUBQUEUE_ROUTE_KEY = Symbol("SUBQUEUE_ROUTE");

export function SubqueueRoute(): MethodDecorator {
  return SetMetadata(SUBQUEUE_ROUTE_KEY, true);
}
