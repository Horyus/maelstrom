import {MigrationInterface, QueryRunner} from "typeorm";

export class Entities1545069837379 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "coin" ("name" character varying NOT NULL, "config" character varying NOT NULL, CONSTRAINT "PK_cdd043775564c551f6856bfb3e3" PRIMARY KEY ("name"))`);
        await queryRunner.query(`CREATE TABLE "dataset_infos" ("Id" character varying NOT NULL, "coin" character varying NOT NULL, "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP, CONSTRAINT "PK_7d4fb34192182352b3708edfe99" PRIMARY KEY ("Id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "dataset_infos"`);
        await queryRunner.query(`DROP TABLE "coin"`);
    }

}
