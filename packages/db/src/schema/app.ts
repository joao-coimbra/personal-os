import { defineRelationsPart } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "trello",
  "google_calendar",
  "gmail",
  "notion",
  "anthropic",
  "openai",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "disconnected",
  "connecting",
  "connected",
  "expired",
  "error",
]);

export const pendingActionStatusEnum = pgEnum("pending_action_status", [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
]);

export const userPreference = pgTable("user_preference", {
  breakMinutes: integer("break_minutes").default(15).notNull(),
  focusMinutes: integer("focus_minutes").default(50).notNull(),
  id: text("id").primaryKey(),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  preferredAiProvider: text("preferred_ai_provider"),
  timezone: text("timezone").default("America/Sao_Paulo").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  workEnd: text("work_end").default("18:00").notNull(),
  workStart: text("work_start").default("09:00").notNull(),
});

export const integrationConnection = pgTable(
  "integration_connection",
  {
    accessTokenEncrypted: text("access_token_encrypted"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    errorCode: text("error_code"),
    externalAccountLabel: text("external_account_label"),
    id: text("id").primaryKey(),
    lastSyncAt: timestamp("last_sync_at"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    provider: integrationProviderEnum("provider").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    scopes: text("scopes"),
    status: integrationStatusEnum("status").default("disconnected").notNull(),
    tokenExpiresAt: timestamp("token_expires_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("integration_connection_user_provider_idx").on(
      table.userId,
      table.provider
    ),
  ]
);

export const pendingAiAction = pgTable(
  "pending_ai_action",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: pendingActionStatusEnum("status").default("pending").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("pending_ai_action_user_idx").on(table.userId)]
);

export const localWorkspace = pgTable(
  "local_workspace",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    pathFingerprint: text("path_fingerprint").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("local_workspace_user_idx").on(table.userId)]
);

export const mcpCredential = pgTable(
  "mcp_credential",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    tokenHash: text("token_hash").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("mcp_credential_user_idx").on(table.userId)]
);

export const appRelations = defineRelationsPart(
  {
    integrationConnection,
    localWorkspace,
    mcpCredential,
    pendingAiAction,
    user,
    userPreference,
  },
  (r) => ({
    integrationConnection: {
      user: r.one.user({
        from: r.integrationConnection.userId,
        to: r.user.id,
      }),
    },
    localWorkspace: {
      user: r.one.user({
        from: r.localWorkspace.userId,
        to: r.user.id,
      }),
    },
    mcpCredential: {
      user: r.one.user({
        from: r.mcpCredential.userId,
        to: r.user.id,
      }),
    },
    pendingAiAction: {
      user: r.one.user({
        from: r.pendingAiAction.userId,
        to: r.user.id,
      }),
    },
    userPreference: {
      user: r.one.user({
        from: r.userPreference.userId,
        to: r.user.id,
      }),
    },
  })
);
