import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type PageParentData = EnsureDefined<LayoutData>;
type LayoutRouteId = RouteId | "/" | "/docs" | "/docs/[...1]overview/[...1]svelte-email" | "/docs/[...2]getting-started/[...1]installation" | "/docs/[...2]getting-started/[...2]usage" | "/docs/[...3]components/[...10]link" | "/docs/[...3]components/[...11]preview" | "/docs/[...3]components/[...12]text" | "/docs/[...3]components/[...1]HTML" | "/docs/[...3]components/[...2]head" | "/docs/[...3]components/[...3]button" | "/docs/[...3]components/[...4]container" | "/docs/[...3]components/[...5]column" | "/docs/[...3]components/[...6]section" | "/docs/[...3]components/[...7]heading" | "/docs/[...3]components/[...8]hr" | "/docs/[...3]components/[...9]image" | "/docs/[...4]utilities/[...1]render" | "/docs/[...5]integrations/[...1]overview" | "/docs/[...5]integrations/[...2]nodemailer" | "/docs/[...5]integrations/[...3]sendgrid" | "/docs/[...5]integrations/[...4]postmark" | "/docs/[...5]integrations/[...5]aws-ses" | "/docs/[...6]examples/[...1]airbnb-review" | "/docs/[...6]examples/[...1]apple-receipt" | null
type LayoutParams = RouteParams & { 1?: string; 2?: string; 3?: string; 10?: string; 11?: string; 12?: string; 4?: string; 5?: string; 6?: string; 7?: string; 8?: string; 9?: string }
type LayoutParentData = EnsureDefined<{}>;

export type PageServerData = null;
export type PageLoad<OutputData extends OutputDataShape<PageParentData> = OutputDataShape<PageParentData>> = Kit.Load<RouteParams, PageServerData, PageParentData, OutputData, RouteId>;
export type PageLoadEvent = Parameters<PageLoad>[0];
export type PageData = Expand<Omit<PageParentData, keyof Kit.LoadProperties<Awaited<ReturnType<typeof import('./proxy+page.js').load>>>> & OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('./proxy+page.js').load>>>>>>;
export type LayoutServerData = null;
export type LayoutLoad<OutputData extends OutputDataShape<LayoutParentData> = OutputDataShape<LayoutParentData>> = Kit.Load<LayoutParams, LayoutServerData, LayoutParentData, OutputData, LayoutRouteId>;
export type LayoutLoadEvent = Parameters<LayoutLoad>[0];
export type LayoutData = Expand<Omit<LayoutParentData, keyof Kit.LoadProperties<Awaited<ReturnType<typeof import('../../../../src/routes/+layout.js').load>>>> & OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('../../../../src/routes/+layout.js').load>>>>>>;