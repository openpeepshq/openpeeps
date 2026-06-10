/**
 * Top-level middleware for every `./api/**` route.
 *
 * Riddl's API loader looks for files named `middleware.ts` and treats the
 * entire module as a `Middleware` (`{ pre, post }`). We re-export the named
 * `pre` and `post` from the authorization middleware so this file matches
 * that shape.
 */
import middleware from '#lib/middleware/authorization';

export const pre = middleware.pre;
export const post = middleware.post;
