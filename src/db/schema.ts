import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Custom type for tsvector (full-text search)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash'),
    role: varchar('role', { length: 20 }).notNull().default('buyer'),
    stripeAccountId: varchar('stripe_account_id', { length: 100 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
    emailVerified: boolean('email_verified').notNull().default(false),
    emailVerifyToken: text('email_verify_token'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiry: timestamp('password_reset_expiry'),
    profile: jsonb('profile').notNull().default({}),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    stripeAccountIdx: index('users_stripe_account_idx').on(t.stripeAccountId),
  })
)

// ─── OAuth providers ──────────────────────────────────────────────────────────

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 200 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqueProvider: uniqueIndex('oauth_accounts_provider_idx').on(t.provider, t.providerAccountId),
    userIdx: index('oauth_accounts_user_idx').on(t.userId),
  })
)

// ─── Refresh tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    tokenIdx: uniqueIndex('refresh_tokens_hash_idx').on(t.tokenHash),
  })
)

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): ReturnType<typeof uuid> => categories.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
    parentIdx: index('categories_parent_idx').on(t.parentId),
  })
)

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id').notNull().references(() => users.id),
    categoryId: uuid('category_id').notNull().references(() => categories.id),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    attributes: jsonb('attributes').notNull().default({}),
    searchVector: tsvector('search_vector'),
    viewCount: integer('view_count').notNull().default(0),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    sellerIdx: index('listings_seller_idx').on(t.sellerId),
    categoryIdx: index('listings_category_idx').on(t.categoryId),
    statusIdx: index('listings_status_idx').on(t.status),
    createdIdx: index('listings_created_idx').on(t.createdAt),
  })
)

// ─── Listing images ───────────────────────────────────────────────────────────

export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
    s3Key: text('s3_key').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    listingIdx: index('listing_images_listing_idx').on(t.listingId),
  })
)

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerId: uuid('buyer_id').notNull().references(() => users.id),
    listingId: uuid('listing_id').notNull().references(() => listings.id),
    status: varchar('status', { length: 30 }).notNull().default('pending_payment'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    platformFee: numeric('platform_fee', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    buyerIdx: index('orders_buyer_idx').on(t.buyerId),
    listingIdx: index('orders_listing_idx').on(t.listingId),
    statusIdx: index('orders_status_idx').on(t.status),
  })
)

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 200 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    settledAt: timestamp('settled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: uniqueIndex('payments_order_idx').on(t.orderId),
    stripeIdx: uniqueIndex('payments_stripe_idx').on(t.stripePaymentIntentId),
  })
)

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id').notNull().references(() => users.id),
    listingId: uuid('listing_id').notNull().references(() => listings.id),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    rating: integer('rating').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    listingIdx: index('reviews_listing_idx').on(t.listingId),
    authorIdx: index('reviews_author_idx').on(t.authorId),
    orderIdx: uniqueIndex('reviews_order_idx').on(t.orderId),
  })
)

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id').notNull().references(() => users.id),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    body: text('body').notNull(),
    read: boolean('read').notNull().default(false),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index('messages_order_idx').on(t.orderId),
    senderIdx: index('messages_sender_idx').on(t.senderId),
    sentIdx: index('messages_sent_idx').on(t.sentAt),
  })
)

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    read: boolean('read').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    readIdx: index('notifications_read_idx').on(t.read),
  })
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  orders: many(orders),
  reviews: many(reviews),
  messages: many(messages),
  notifications: many(notifications),
  oauthAccounts: many(oauthAccounts),
  refreshTokens: many(refreshTokens),
}))

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, { fields: [listings.sellerId], references: [users.id] }),
  category: one(categories, { fields: [listings.categoryId], references: [categories.id] }),
  images: many(listingImages),
  orders: many(orders),
  reviews: many(reviews),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  listing: one(listings, { fields: [orders.listingId], references: [listings.id] }),
  payment: one(payments),
  messages: many(messages),
  review: one(reviews),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
  children: many(categories),
  listings: many(listings),
}))
