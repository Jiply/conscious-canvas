/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as conversations from "../conversations.js";
import type * as conversationsMutations from "../conversationsMutations.js";
import type * as decisions from "../decisions.js";
import type * as gemini from "../gemini.js";
import type * as heartbeat from "../heartbeat.js";
import type * as llm from "../llm.js";
import type * as map from "../map.js";
import type * as observations from "../observations.js";
import type * as opinionGeneration from "../opinionGeneration.js";
import type * as opinions from "../opinions.js";
import type * as pathfinding from "../pathfinding.js";
import type * as seed from "../seed.js";
import type * as seedMap from "../seedMap.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  conversations: typeof conversations;
  conversationsMutations: typeof conversationsMutations;
  decisions: typeof decisions;
  gemini: typeof gemini;
  heartbeat: typeof heartbeat;
  llm: typeof llm;
  map: typeof map;
  observations: typeof observations;
  opinionGeneration: typeof opinionGeneration;
  opinions: typeof opinions;
  pathfinding: typeof pathfinding;
  seed: typeof seed;
  seedMap: typeof seedMap;
  tasks: typeof tasks;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
