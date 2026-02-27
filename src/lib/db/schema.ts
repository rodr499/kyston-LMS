import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const churchPlanEnum = pgEnum("church_plan", [
  "free",
  "pro",
  "unlimited",
]);
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "church_admin",
  "facilitator",
  "student",
]);
export const classModeEnum = pgEnum("class_mode", ["on_demand", "academic"]);
export const gradingSystemEnum = pgEnum("grading_system", [
  "completion",
  "pass_fail",
  "letter_grade",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "enrolled",
  "completed",
  "dropped",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "video_watch",
  "assessment",
  "file_upload",
  "acknowledgment",
  "content_article",
  "point_assessment",
]);
export const completionStatusEnum = pgEnum("completion_status", [
  "not_started",
  "in_progress",
  "completed",
  "failed",
]);
export const meetingPlatformEnum = pgEnum("meeting_platform", [
  "none",
  "zoom",
  "teams",
  "google_meet",
]);
export const integrationPlatformEnum = pgEnum("integration_platform", [
  "zoom",
  "teams",
  "google_meet",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "excused",
]);
export const integrationsModeEnum = pgEnum("integrations_mode", [
  "none",
  "auto",
  "manual",
]);
export const couponGrantTypeEnum = pgEnum("coupon_grant_type", [
  "plan",
  "manual_config",
]);
export const couponDurationTypeEnum = pgEnum("coupon_duration_type", [
  "permanent",
  "days",
  "months",
]);
export const integrationRequestStatusEnum = pgEnum("integration_request_status", [
  "pending",
  "approved",
  "denied",
]);

// Platform-wide settings (super admin only to modify)
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Tables
export const churches = pgTable("churches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#6D28D9").notNull(),
  secondaryColor: text("secondary_color"),
  bannerType: text("banner_type"),
  bannerImageUrl: text("banner_image_url"),
  bannerColor: text("banner_color"),
  plan: churchPlanEnum("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isActive: boolean("is_active").default(true).notNull(),
  customDomain: text("custom_domain"),
  customDomainRecordType: text("custom_domain_record_type"),
  websiteUrl: text("website_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  linkColor: text("link_color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isPublic: boolean("is_public").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  maxFacilitators: integer("max_facilitators").default(3).notNull(),
  maxStudents: integer("max_students").default(20).notNull(),
  maxPrograms: integer("max_programs").default(2).notNull(),
  maxCourses: integer("max_courses").default(5).notNull(),
  maxStorageMb: integer("max_storage_mb").default(500).notNull(),
  integrationsMode: integrationsModeEnum("integrations_mode").default("none").notNull(),
  allowedIntegrations: jsonb("allowed_integrations").$type<string[]>().default([]),
  customBranding: boolean("custom_branding").default(false).notNull(),
  certificates: boolean("certificates").default(false).notNull(),
  smsNotifications: boolean("sms_notifications").default(false).notNull(),
  analytics: boolean("analytics").default(false).notNull(),
  prioritySupport: boolean("priority_support").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  churchId: uuid("church_id").references(() => churches.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const churchPlanConfig = pgTable("church_plan_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  isManualOverride: boolean("is_manual_override").default(false).notNull(),
  overrideMaxFacilitators: integer("override_max_facilitators"),
  overrideMaxStudents: integer("override_max_students"),
  overrideMaxPrograms: integer("override_max_programs"),
  overrideMaxCourses: integer("override_max_courses"),
  overrideMaxStorageMb: integer("override_max_storage_mb"),
  overrideIntegrationsMode: integrationsModeEnum("override_integrations_mode"),
  overrideAllowedIntegrations: jsonb("override_allowed_integrations").$type<string[]>(),
  overrideCustomBranding: boolean("override_custom_branding"),
  overrideCertificates: boolean("override_certificates"),
  overrideSmsNotifications: boolean("override_sms_notifications"),
  overrideAnalytics: boolean("override_analytics"),
  adminNotes: text("admin_notes"),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id, { onDelete: "set null" }),
  lastModifiedAt: timestamp("last_modified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const couponCodes = pgTable("coupon_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description"),
  grantType: couponGrantTypeEnum("grant_type").notNull(),
  grantPlanId: uuid("grant_plan_id").references(() => plans.id, { onDelete: "set null" }),
  grantMaxFacilitators: integer("grant_max_facilitators"),
  grantMaxStudents: integer("grant_max_students"),
  grantMaxPrograms: integer("grant_max_programs"),
  grantMaxCourses: integer("grant_max_courses"),
  grantMaxStorageMb: integer("grant_max_storage_mb"),
  grantIntegrationsMode: integrationsModeEnum("grant_integrations_mode"),
  grantAllowedIntegrations: jsonb("grant_allowed_integrations").$type<string[]>(),
  grantCustomBranding: boolean("grant_custom_branding"),
  grantCertificates: boolean("grant_certificates"),
  grantSmsNotifications: boolean("grant_sms_notifications"),
  durationType: couponDurationTypeEnum("duration_type").default("permanent").notNull(),
  durationValue: integer("duration_value"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id")
    .references(() => couponCodes.id, { onDelete: "cascade" })
    .notNull(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  redeemedBy: uuid("redeemed_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const integrationRequests = pgTable("integration_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  platform: integrationPlatformEnum("platform").notNull(),
  status: integrationRequestStatusEnum("status").default("pending").notNull(),
  requestNote: text("request_note"),
  responseNote: text("response_note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Self-referencing FK (prerequisite_course_id) is defined in migration; no .references() here to avoid circular type
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  programId: uuid("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prerequisiteCourseId: uuid("prerequisite_course_id"),
  isPublished: boolean("is_published").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  mode: classModeEnum("mode").default("on_demand").notNull(),
  gradingSystem: gradingSystemEnum("grading_system")
    .default("completion")
    .notNull(),
  facilitatorId: uuid("facilitator_id").references(() => users.id, {
    onDelete: "set null",
  }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  meetingPlatform: meetingPlatformEnum("meeting_platform")
    .default("none")
    .notNull(),
  meetingUrl: text("meeting_url"),
  meetingId: text("meeting_id"),
  meetingScheduledAt: timestamp("meeting_scheduled_at", { withTimezone: true }),
  meetingDurationMinutes: integer("meeting_duration_minutes").default(60),
  /** For Teams: recurring series. { type: 'weekly', daysOfWeek: number[], endDate: 'YYYY-MM-DD' } or null. */
  meetingRecurrence: jsonb("meeting_recurrence"),
  allowSelfEnrollment: boolean("allow_self_enrollment").default(false).notNull(),
  noEnrollmentNeeded: boolean("no_enrollment_needed").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  /** When true, class is visible but enrollment is closed; show closedContactUser to reach out. */
  closedForEnrollment: boolean("closed_for_enrollment").default(false).notNull(),
  /** User to contact when closedForEnrollment is true (tenant user selected from dropdown). */
  closedContactUserId: uuid("closed_contact_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .notNull(),
  studentId: uuid("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: enrollmentStatusEnum("status").default("enrolled").notNull(),
  grade: text("grade"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  type: activityTypeEnum("type").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>(),
  orderIndex: integer("order_index").notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  points: integer("points").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const activityCompletions = pgTable("activity_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  activityId: uuid("activity_id")
    .references(() => activities.id, { onDelete: "cascade" })
    .notNull(),
  studentId: uuid("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: completionStatusEnum("status").default("not_started").notNull(),
  score: integer("score"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  responseData: jsonb("response_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const churchIntegrations = pgTable("church_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  platform: integrationPlatformEnum("platform").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  /** Platform-specific config, e.g. Teams: { facilitatorGroupId: "azure-ad-group-object-id" } */
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id")
    .references(() => churches.id, { onDelete: "cascade" })
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .notNull(),
  studentId: uuid("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionDate: date("session_date").notNull(),
  status: attendanceStatusEnum("status").default("absent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const churchesRelations = relations(churches, ({ one, many }) => ({
  users: many(users),
  programs: many(programs),
  enrollments: many(enrollments),
  classes: many(classes),
  activities: many(activities),
  activityCompletions: many(activityCompletions),
  churchIntegrations: many(churchIntegrations),
  attendance: many(attendance),
  planConfig: one(churchPlanConfig),
  couponRedemptions: many(couponRedemptions),
  integrationRequests: many(integrationRequests),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  churchPlanConfigs: many(churchPlanConfig),
  couponCodes: many(couponCodes),
}));

export const churchPlanConfigRelations = relations(churchPlanConfig, ({ one }) => ({
  church: one(churches, { fields: [churchPlanConfig.churchId], references: [churches.id] }),
  plan: one(plans, { fields: [churchPlanConfig.planId], references: [plans.id] }),
  lastModifiedByUser: one(users, { fields: [churchPlanConfig.lastModifiedBy], references: [users.id] }),
}));

export const couponCodesRelations = relations(couponCodes, ({ one, many }) => ({
  plan: one(plans, { fields: [couponCodes.grantPlanId], references: [plans.id] }),
  createdByUser: one(users, { fields: [couponCodes.createdBy], references: [users.id] }),
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(couponCodes, { fields: [couponRedemptions.couponId], references: [couponCodes.id] }),
  church: one(churches, { fields: [couponRedemptions.churchId], references: [churches.id] }),
  redeemedByUser: one(users, { fields: [couponRedemptions.redeemedBy], references: [users.id] }),
}));

export const integrationRequestsRelations = relations(integrationRequests, ({ one }) => ({
  church: one(churches, { fields: [integrationRequests.churchId], references: [churches.id] }),
  reviewedByUser: one(users, { fields: [integrationRequests.reviewedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  church: one(churches),
  facilitatedClasses: many(classes),
  enrollments: many(enrollments),
  activityCompletions: many(activityCompletions),
  attendance: many(attendance),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  church: one(churches, {
    fields: [programs.churchId],
    references: [churches.id],
  }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  church: one(churches, {
    fields: [courses.churchId],
    references: [churches.id],
  }),
  program: one(programs, {
    fields: [courses.programId],
    references: [programs.id],
  }),
  prerequisite: one(courses, {
    fields: [courses.prerequisiteCourseId],
    references: [courses.id],
  }),
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  church: one(churches, {
    fields: [classes.churchId],
    references: [churches.id],
  }),
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  facilitator: one(users, {
    fields: [classes.facilitatorId],
    references: [users.id],
  }),
  closedContactUser: one(users, {
    fields: [classes.closedContactUserId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  activities: many(activities),
  attendance: many(attendance),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  church: one(churches, {
    fields: [enrollments.churchId],
    references: [churches.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  church: one(churches),
  class: one(classes),
  completions: many(activityCompletions),
}));

export const activityCompletionsRelations = relations(
  activityCompletions,
  ({ one }) => ({
    church: one(churches),
    activity: one(activities),
    student: one(users),
  })
);

export const churchIntegrationsRelations = relations(
  churchIntegrations,
  ({ one }) => ({
    church: one(churches),
  })
);

export const attendanceRelations = relations(attendance, ({ one }) => ({
  church: one(churches),
  class: one(classes),
  student: one(users),
}));
