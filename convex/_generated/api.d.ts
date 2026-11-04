/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as llm from '../llm.js';
import type * as map from '../map.js';
import type * as seed from '../seed.js';
import type * as agents from '../agents.js';
import type * as events from '../events.js';
import type * as seedMap from '../seedMap.js';
import type * as opinions from '../opinions.js';
import type * as decisions from '../decisions.js';
import type * as heartbeat from '../heartbeat.js';
import type * as observers from '../observers.js';
import type * as pathfinding from '../pathfinding.js';
import type * as observations from '../observations.js';
import type * as conversations from '../conversations.js';
import type * as conversationsMutations from '../conversationsMutations.js';
import type { FilterApi, ApiFromModules, FunctionReference } from 'convex/server';

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  llm: typeof llm;
  map: typeof map;
  seed: typeof seed;
  agents: typeof agents;
  events: typeof events;
  seedMap: typeof seedMap;
  opinions: typeof opinions;
  decisions: typeof decisions;
  heartbeat: typeof heartbeat;
  observers: typeof observers;
  pathfinding: typeof pathfinding;
  observations: typeof observations;
  conversations: typeof conversations;
  conversationsMutations: typeof conversationsMutations;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<typeof fullApiWithMounts, FunctionReference<any, 'public'>>;
export declare const internal: FilterApi<typeof fullApiWithMounts, FunctionReference<any, 'internal'>>;

export declare const components: {};
