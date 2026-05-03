ALTER TABLE "payments"
ADD COLUMN "plan_name" VARCHAR(50),
ADD COLUMN "billing_cycle" VARCHAR(20),
ADD COLUMN "provider_reference" VARCHAR(255),
ADD COLUMN "provider_transaction_id" VARCHAR(255),
ADD COLUMN "provider_response_code" VARCHAR(20),
ADD COLUMN "provider_transaction_status" VARCHAR(20),
ADD COLUMN "provider_payload" JSONB;

CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments"("provider_reference");
CREATE INDEX "payments_provider_transaction_id_idx" ON "payments"("provider_transaction_id");
