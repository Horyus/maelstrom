import { DatabaseConnection }                from './DatabaseConnection';
import { EntityManager, Table, TableColumn } from 'typeorm';
import { DatasetConfig }                     from '../types/DatasetConfig';
import * as Moment                           from 'moment';
import { ConfigManager }                     from '../config/ConfigManager';
import { getRoundedTime }                    from '../helpers/getRoundedTime';
import { TablesDetails }                     from '../types/TablesDetails';
import { RecoverPayload }                    from '../types/RecoverPayload';

const MANDATORY_COLUMNS = [
    {
        name: 'time',
        type: 'timestamp',
        isPrimary: true
    }
];

export class DatasetTablesManager {

    private static instance: DatasetTablesManager;
    private readonly columns: any[] = [...MANDATORY_COLUMNS];

    private constructor() {
    }

    public static get Instance(): DatasetTablesManager {
        return (DatasetTablesManager.instance || (DatasetTablesManager.instance = new DatasetTablesManager()));
    }

    public static async getTablesDetails(): Promise<TablesDetails[]> {

        const ret: TablesDetails[] = [];

        const raw: any = await DatabaseConnection.Instance._
            .query(`SELECT "tablename" FROM pg_catalog.pg_tables WHERE ("tablename" LIKE 'MAELSTROM___%')`);

        for (const table of raw) {
            const {count}: { count: string } = (await DatabaseConnection.Instance._
                .query(`SELECT COUNT(time) from "${table.tablename}" WHERE ("${table.tablename}" IS NOT NULL)`))[0];
            ret.push({
                name: table.tablename.slice(12),
                count: parseInt(count)
            });
        }

        return ret;

    }

    static async set(plugin: string, coin: string, timestamp: number, data: any): Promise<void> {

        const processed: any = {};

        for (const key of Object.keys(data)) {
            processed[plugin + '_' + key] = (<any> data)[key];
        }

        await DatabaseConnection.Instance._.createQueryBuilder()
            .insert()
            .into(`MAELSTROM___${coin}`)
            .values({
                ...processed,
                time: Moment(timestamp).format()
            })
            .onConflict(DatasetTablesManager.gen_update_query(plugin, data))
            .setParameters(processed)
            .execute();
    }

    private static gen_last_query(coin: string): string {
        return `SELECT "time" from "MAELSTROM___${coin}" ORDER BY time desc LIMIT 1`;
    }

    private static gen_holes_query(plugin: string, config: DatasetConfig[], coin: string): string {
        let query: string = `SELECT "time" from "MAELSTROM___${coin}" WHERE (`;
        let begin: boolean = true;
        for (const field of config) {
            if (!begin) {
                query += ' OR ';
            }
            if (begin) {
                begin = false;
            }
            query += `${field.field_name} IS NULL`;
        }
        query += `) ORDER BY "time" asc`;
        return query;
    }

    private static gen_update_query(plugin: string, data: any): string {
        let query: string = `("time") DO UPDATE SET `;
        let first: boolean = true;
        for (const key of Object.keys(data)) {
            if (!first) {
                query += ', ';
            } else {
                first = false;
            }

            query += `"${plugin + '_' + key}" = :${plugin + '_' + key}`;
        }

        return query;
    }

    public addDatasetConfig(config: DatasetConfig): void {
        this.columns.push({
            name: config.field_name,
            type: config.field_type,
            isNullable: true
        });
    }

    public async init(plugin: string, config: DatasetConfig[], coin: string): Promise<RecoverPayload> {

        await DatabaseConnection.Instance._.transaction(async (tem: EntityManager) => {
            await tem.queryRunner
                .createTable(new Table({
                    name: `MAELSTROM___${coin}`,
                    columns: this.columns as TableColumn[]
                }), true);
        });

        const {count}: { count: string } = (await DatabaseConnection.Instance._
            .query(`SELECT COUNT(time) from "MAELSTROM___${coin}"`))[0];

        if (count === '0') {
            if (ConfigManager.Instance._.start_time && ConfigManager.Instance._.start_time[coin]) {
                return {
                    start: getRoundedTime(ConfigManager.Instance._.start_time[coin]),
                    holes: []
                };
            }
            return {
                start: getRoundedTime(),
                holes: []
            };
        }

        const holes_query: string = DatasetTablesManager.gen_holes_query(plugin, config, coin);
        const holes_data: number[] = (await DatabaseConnection.Instance._.query(holes_query)).map((res: any) =>
            Moment(res.time).valueOf());

        const last_query: string = DatasetTablesManager.gen_last_query(coin);
        const last_data: number = (await DatabaseConnection.Instance._.query(last_query)).map((res: any) =>
            Moment(res.time).valueOf())[0];

        return {
            start: last_data,
            holes: holes_data
        };
    }

}
