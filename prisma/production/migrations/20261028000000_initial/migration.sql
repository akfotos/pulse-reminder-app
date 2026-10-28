CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'Once',
    "intervalDays" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "reference" TEXT NOT NULL DEFAULT '',
    "alerts" TEXT NOT NULL DEFAULT '30,7,0',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT NOT NULL DEFAULT '',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL DEFAULT 'My workspace',
    "workspaceName" TEXT NOT NULL DEFAULT 'Personal space',
    "digestDay" INTEGER NOT NULL DEFAULT 1,
    "includeNotes" BOOLEAN NOT NULL DEFAULT true,
    "defaultCategory" TEXT NOT NULL DEFAULT 'Birthday',
    "defaultAlerts" TEXT NOT NULL DEFAULT '30,7,0',
    "documentWarningDays" INTEGER NOT NULL DEFAULT 180,
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM d, yyyy',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "showAnalytics" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Delivery_key_key" ON "Delivery"("key");
