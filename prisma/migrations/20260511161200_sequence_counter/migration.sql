CREATE TABLE "SequenceCounter" (
    "tenantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("tenantId","scope")
);

ALTER TABLE "SequenceCounter"
ADD CONSTRAINT "SequenceCounter_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SequenceCounter" ("tenantId", "scope", "currentValue", "createdAt", "updatedAt")
SELECT
    "tenantId",
    'quote',
    MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Quote"
WHERE number LIKE 'ORC-%'
GROUP BY "tenantId"
ON CONFLICT ("tenantId", "scope")
DO UPDATE SET
    "currentValue" = GREATEST("SequenceCounter"."currentValue", EXCLUDED."currentValue"),
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SequenceCounter" ("tenantId", "scope", "currentValue", "createdAt", "updatedAt")
SELECT
    "tenantId",
    'serviceOrder',
    MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ServiceOrder"
WHERE number LIKE 'OS-%'
GROUP BY "tenantId"
ON CONFLICT ("tenantId", "scope")
DO UPDATE SET
    "currentValue" = GREATEST("SequenceCounter"."currentValue", EXCLUDED."currentValue"),
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SequenceCounter" ("tenantId", "scope", "currentValue", "createdAt", "updatedAt")
SELECT
    "tenantId",
    'contract',
    MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Contract"
WHERE number LIKE 'CTR-%'
GROUP BY "tenantId"
ON CONFLICT ("tenantId", "scope")
DO UPDATE SET
    "currentValue" = GREATEST("SequenceCounter"."currentValue", EXCLUDED."currentValue"),
    "updatedAt" = CURRENT_TIMESTAMP;