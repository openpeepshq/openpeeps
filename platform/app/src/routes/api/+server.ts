import api from '$api';
import { OpenApiGeneratorV3, OpenAPIRegistry, z, type RouteConfig } from 'sveltekit-api';
import { json, type RequestEvent } from '@sveltejs/kit';

type ParsedRouteModule = {
  path: string;
  method: string;
  body?: z.ZodType;
  query?: z.ZodType;
  param?: z.ZodType;
  output?: z.ZodType;
  stream?: z.ZodType;
  errors: Array<{ status: number; body: { message: string } }>;
  modifier: (config: Record<string, unknown>) => Record<string, unknown>;
};

type InternalApi = {
  routes: Record<string, () => Promise<unknown>>;
  config: Record<string, unknown>;
  register: (registry: OpenAPIRegistry) => void;
  parse_module: (id: string) => Promise<ParsedRouteModule>;
};

export const GET = async (evt: RequestEvent) => {
  const internalApi = api as unknown as InternalApi;
  const registry = new OpenAPIRegistry();

  for (const route of Object.keys(internalApi.routes)) {
    const module = await internalApi.parse_module(route);
    const config = module.modifier({
      method: module.method.toLowerCase(),
      path: module.path,
      responses: {
        ...(module.output
          ? {
            '200': {
              description: '',
            },
          }
          : undefined),
        ...(module.stream
          ? {
            '200': {
              description: '',
            },
          }
          : undefined),
        ...(Object.fromEntries(
          module.errors.map((error) => [
            error.status,
            {
              description: error.body.message,
            },
          ]),
        ) ?? {}),
      },
    }) as RouteConfig;

    registry.registerPath(config);
  }

  internalApi.register(registry);
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const openapi = generator.generateDocument({
    servers: [{ url: evt.url.origin }],
    ...internalApi.config,
  });

  return json(openapi);
};
