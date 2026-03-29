import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSomeColumn1774770941978 implements MigrationInterface {
    name = 'AddSomeColumn1774770941978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP CONSTRAINT "job_search_criteria_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "status" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "company_name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN "company_city"`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD "company_city" character varying`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN "application_applied_date"`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD "application_applied_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "is_auto_created" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "first_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "users_email_key"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "job_search_criteria_criteria_id_seq" OWNED BY "job_search_criteria"."criteria_id"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "criteria_id" SET DEFAULT nextval('"job_search_criteria_criteria_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "criteria_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "location" character varying`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "position_type"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "position_type" character varying`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "company_name"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "company_name" character varying`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD CONSTRAINT "FK_9e37694e5add87499bb9e1eab5e" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD CONSTRAINT "FK_597a5a80a654f1d1406e3afb3b1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP CONSTRAINT "FK_597a5a80a654f1d1406e3afb3b1"`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP CONSTRAINT "FK_9e37694e5add87499bb9e1eab5e"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "company_name"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "company_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "position_type"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "position_type" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD "location" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "criteria_id" SET DEFAULT nextval('job_search_criteria_id_seq')`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ALTER COLUMN "criteria_id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "job_search_criteria_criteria_id_seq"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "first_name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "is_auto_created" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN "application_applied_date"`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD "application_applied_date" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "job_search" DROP COLUMN "company_city"`);
        await queryRunner.query(`ALTER TABLE "job_search" ADD "company_city" text`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "company_name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "job_search_criteria" ADD CONSTRAINT "job_search_criteria_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
