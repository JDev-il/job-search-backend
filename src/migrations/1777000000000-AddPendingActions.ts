import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPendingActions1777000000000 implements MigrationInterface {
    name = 'AddPendingActions1777000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "job_search"
            ADD COLUMN IF NOT EXISTS "gmail_thread_id" character varying NULL
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "pending_action_type_enum" AS ENUM (
                    'STATUS_CHANGE',
                    'AUTO_CREATE_APPLICATION',
                    'LINK_THREAD_TO_APPLICATION',
                    'DRAFT_FOLLOW_UP'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "pending_action_resolution_enum" AS ENUM (
                    'pending',
                    'accepted',
                    'rejected'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "pending_actions" (
                "id" SERIAL PRIMARY KEY,
                "user_id" integer NOT NULL,
                "job_id" integer NULL,
                "type" "pending_action_type_enum" NOT NULL,
                "evidence" jsonb NOT NULL,
                "proposed_change" jsonb NOT NULL,
                "question" text NOT NULL,
                "resolution" "pending_action_resolution_enum" NOT NULL DEFAULT 'pending',
                "gmail_message_id" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "resolved_at" TIMESTAMP NULL,
                CONSTRAINT "fk_pending_action_user"
                    FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE,
                CONSTRAINT "fk_pending_action_job"
                    FOREIGN KEY ("job_id") REFERENCES "job_search" ("job_id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_pending_action_user_message"
            ON "pending_actions" ("user_id", "gmail_message_id")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "ix_pending_action_user_resolution"
            ON "pending_actions" ("user_id", "resolution")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "ix_pending_action_user_resolution"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "uq_pending_action_user_message"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "pending_actions"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "pending_action_resolution_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "pending_action_type_enum"`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN IF EXISTS "gmail_thread_id"`);
    }
}
