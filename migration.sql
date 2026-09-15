-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "images" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT,
    "sellerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "mpesaCheckoutRequestId" TEXT,
    "mpesaReceipt" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "mpesaCheckoutRequestId" TEXT,
    "mpesaReceipt" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advertisements_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "advertisements_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_sellerId_idx" ON "listings"("sellerId");

-- CreateIndex
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX "orders_listingId_idx" ON "orders"("listingId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "advertisements_ownerId_idx" ON "advertisements"("ownerId");

-- CreateIndex
CREATE INDEX "advertisements_listingId_idx" ON "advertisements"("listingId");

-- CreateIndex
CREATE INDEX "advertisements_status_idx" ON "advertisements"("status");

-- AlterTable
ALTER TABLE "advertisements" ADD COLUMN "videoSource" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "movers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "movers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "movers_ownerId_idx" ON "movers"("ownerId");

-- CreateIndex
CREATE INDEX "movers_active_idx" ON "movers"("active");

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "mpesaCheckoutRequestId" TEXT;
ALTER TABLE "listings" ADD COLUMN "mpesaReceipt" TEXT;
ALTER TABLE "listings" ADD COLUMN "failureReason" TEXT;

-- AlterTable
ALTER TABLE "advertisements" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "pendingExtensionDays" INTEGER;

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_resource_action_key" ON "role_permissions"("roleId", "resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- AlterTable
ALTER TABLE "users" ADD COLUMN "customRoleId" TEXT;

-- CreateIndex
CREATE INDEX "users_customRoleId_idx" ON "users"("customRoleId");

-- AlterTable (YouTube video source removed — only uploaded videos remain)
ALTER TABLE "advertisements" DROP COLUMN "videoSource";

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount" TEXT,
    "phone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "offers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "offers_ownerId_idx" ON "offers"("ownerId");

-- CreateIndex
CREATE INDEX "offers_active_idx" ON "offers"("active");

-- CreateTable
CREATE TABLE "eateries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foodType" TEXT,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT,
    "badge" BOOLEAN NOT NULL DEFAULT false,
    "badgeCheckoutRequestId" TEXT,
    "badgeReceipt" TEXT,
    "badgeFailureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "eateries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "eateries_ownerId_idx" ON "eateries"("ownerId");

-- CreateIndex
CREATE INDEX "eateries_active_idx" ON "eateries"("active");

-- AlterTable (blue-star visibility badge: KES 25 lifts a listing out of the free 500m radius limit)
ALTER TABLE "movers" ADD COLUMN "badge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "movers" ADD COLUMN "badgeCheckoutRequestId" TEXT;
ALTER TABLE "movers" ADD COLUMN "badgeReceipt" TEXT;
ALTER TABLE "movers" ADD COLUMN "badgeFailureReason" TEXT;

-- AlterTable (blue-star visibility badge: KES 25 lifts a listing out of the free 500m radius limit)
ALTER TABLE "offers" ADD COLUMN "badge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offers" ADD COLUMN "badgeCheckoutRequestId" TEXT;
ALTER TABLE "offers" ADD COLUMN "badgeReceipt" TEXT;
ALTER TABLE "offers" ADD COLUMN "badgeFailureReason" TEXT;

-- AlterTable (blue-star visibility badge: KES 25 lifts a listing out of the free 500m radius limit)
ALTER TABLE "listings" ADD COLUMN "badge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listings" ADD COLUMN "badgeCheckoutRequestId" TEXT;
ALTER TABLE "listings" ADD COLUMN "badgeReceipt" TEXT;
ALTER TABLE "listings" ADD COLUMN "badgeFailureReason" TEXT;

