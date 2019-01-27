import * as request                                      from 'request';
import { BatchTimes, IndexedBatchTimes, MissingBatches } from '../../types/BatchTimes';
import { Plugin }                                        from '../Plugin';
import { sameDay }                                       from '../../helpers/sameDay';
import { ShuffleArray }                                  from '../../helpers/ShuffleArray';
import { Sleep }                                         from '../../helpers/Sleep';
import { ConfigManager }                                 from '../../config/ConfigManager';

enum BinanceRequestFields {
    OpenPrice = 1,
    HighPrice,
    LowPrice,
    ClosePrice,
    Volume,
    TradeCount = 8,
    TakerBuyVolume
}

export interface PoloniexPayload {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    quoteVolume: number;
    weightedAverage: number;
}

interface GTrendsConfig {
    error_count: number;
    sleep: number;
    cooldown: number;
}

export class Poloniex extends Plugin<PoloniexPayload> {

    private readonly plugin_config: GTrendsConfig;

    constructor() {
        super('polonie', [

            {
                field_name: 'high',
                field_type: 'decimal'
            },
            {
                field_name: 'low',
                field_type: 'decimal',
            },
            {
                field_name: 'open',
                field_type: 'decimal',
            },
            {
                field_name: 'close',
                field_type: 'decimal',
            },
            {
                field_name: 'volume',
                field_type: 'decimal',
            },
            {
                field_name: 'quoteVolume',
                field_type: 'decimal',
            },
            {
                field_name: 'weightedAverage',
                field_type: 'decimal',
            }
        ]);

        if (!ConfigManager.Instance._.binance) {
            this.plugin_config = {
                error_count: 10,
                sleep: 60,
                cooldown: 5
            };
        } else {
            this.plugin_config = {
                error_count: ConfigManager.Instance._.binance.error_count || 10,
                sleep: ConfigManager.Instance._.binance.sleep || 60,
                cooldown: ConfigManager.Instance._.binance.cooldown || 5,
            };
        }

    }

    private static async sticks(symbol: string, start: number, end: number): Promise<any> {
        return new Promise((ok: any, ko: any): void => {
            request(`https://poloniex.com/public?command=returnChartData&currencyPair=BTC_${symbol}&period=300&start=${start / 1000}&end=${end / 1000}`, function (error: Error, response: any, body: string): void {
                if (error) ko(error);
                if (body) ok(JSON.parse(body));
                ko();
            });
        });
    }

    public async order(batches: MissingBatches): Promise<void> {
        const coin_list: string[] = Object.keys(batches);
        ShuffleArray(coin_list);
        for (const coin of coin_list) {

            if (!batches[coin].length) continue;

            const days: IndexedBatchTimes[][] = [];
            let day_idx: number = 0;

            batches[coin] = batches[coin].sort((batch_left: BatchTimes, batch_right: BatchTimes): number =>
                batch_left.end - batch_right.end);

            days.push([]);
            days[day_idx].push(batches[coin][0]);
            batches[coin] = batches[coin].slice(1);

            // Regroup batches that are on the same day
            for (const batch of batches[coin]) {
                if (sameDay(days[day_idx][days[day_idx].length - 1].end, batch.end)) {
                    days[day_idx].push(batch);
                } else {
                    ++day_idx;
                    days.push([]);
                    days[day_idx].push(batch);
                }
            }

            // Every day equals with 1 request
            for (const day of days) {
                try {

                    const data = await Poloniex.sticks(coin, day[0].start, day[day.length - 1].end);

                    const found: number[] = [];
                    for (const tick of data) {
                        for (const batch of day) {

                            const time: number = tick.date * 1000;

                            if (time !== batch.end) continue;

                            found.push(batch.end);

                            const payload: PoloniexPayload = {} as PoloniexPayload;

                            payload.open = parseFloat(tick.open);
                            payload.low = parseFloat(tick.low);
                            payload.high = parseFloat(tick.high);
                            payload.close = parseFloat(tick.close);
                            payload.volume = parseFloat(tick.volume);
                            payload.quoteVolume = parseFloat(tick.quoteVolume);
                            payload.weightedAverage = parseFloat(tick.weightedAverage);

                            this.on_payload(coin, batch, payload);
                        }

                    }

                    for (const batch of day) {
                        if (found.findIndex((val: number) => val === batch.end) === -1) {
                            this.on_payload(coin, batch, {
                                open: -1,
                                low: -1,
                                high: -1,
                                close: -1,
                                volume: -1,
                                quoteVolume: -1,
                                weightedAverage: -1
                            });
                        }
                    }

                } catch (e) {
                    this.addFail(e);
                    if (this.getFailCount() >= this.plugin_config.error_count) {
                        this.cooldown(this.plugin_config.cooldown);
                        this.teleport();
                        return;
                    } else {
                        this.log.warn(`[${new Date(Date.now())}] [Sleeping for ${this.plugin_config.sleep}s]`);
                        await Sleep(this.plugin_config.sleep);
                    }
                }
            }
        }
    }

    public start(): void {
    }

    public stop(): void {
    }

}
