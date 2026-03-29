import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSomeColumn1774770941978 implements MigrationInterface {
    name = 'AddSomeColumn1774770941978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_access_token" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_refresh_token" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_token_expiry" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_history_id" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_email" character varying`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD COLUMN IF NOT EXISTS "is_auto_created" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN IF EXISTS "is_auto_created"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gmail_email"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gmail_history_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gmail_token_expiry"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gmail_refresh_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gmail_access_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"`);
    }

}
