import * as request                                      from 'request';
import { BatchTimes, IndexedBatchTimes, MissingBatches } from '../../types/BatchTimes';
import { Plugin }                                        from '../Plugin';
import { sameDay }                                       from '../../helpers/sameDay';
import { ShuffleArray }                                  from '../../helpers/ShuffleArray';
import { Sleep }                                         from '../../helpers/Sleep';

enum BinanceRequestFields {
    OpenPrice = 1,
    HighPrice,
    LowPrice,
    ClosePrice,
    Volume,
    TradeCount = 8,
    TakerBuyVolume
}

export interface BinancePayload {
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
    trade_number: number;
    taker_buy: number;
}

export class Binance extends Plugin<BinancePayload> {

    constructor() {
        super('binance', [

            {
                field_name: 'open_price',
                field_type: 'decimal'
            },
            {
                field_name: 'low_price',
                field_type: 'decimal',
            },
            {
                field_name: 'high_price',
                field_type: 'decimal',
            },
            {
                field_name: 'close_price',
                field_type: 'decimal',
            },
            {
                field_name: 'volume',
                field_type: 'decimal',
            },
            {
                field_name: 'trade_number',
                field_type: 'integer',
            },
            {
                field_name: 'taker_buy',
                field_type: 'decimal',
            }
        ]);
    }

    private static async sticks(symbol: string, start: number, end: number): Promise<any> {
        return new Promise((ok: any, ko: any): void => {
            request(`https://api.binance.com/api/v1/klines?symbol=${symbol}BTC&interval=5m&startTime=${start}&endTime=${end}`, function (error: Error, response: any, body: string): void {
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

                    const data = await Binance.sticks(coin, day[0].start, day[day.length - 1].end);

                    const found: number[] = [];
                    for (const tick of data) {
                        for (const batch of day) {

                            const time: number = tick[0];

                            if (time !== batch.end) continue;

                            found.push(batch.end);

                            const payload: BinancePayload = {} as BinancePayload;

                            payload.open_price = parseFloat(tick[BinanceRequestFields.OpenPrice]);
                            payload.low_price = parseFloat(tick[BinanceRequestFields.LowPrice]);
                            payload.high_price = parseFloat(tick[BinanceRequestFields.HighPrice]);
                            payload.close_price = parseFloat(tick[BinanceRequestFields.ClosePrice]);
                            payload.volume = parseFloat(tick[BinanceRequestFields.Volume]);
                            payload.trade_number = tick[BinanceRequestFields.TradeCount];
                            payload.taker_buy = parseFloat(tick[BinanceRequestFields.TakerBuyVolume]);

                            this.on_payload(coin, batch, payload);
                        }

                    }

                    for (const batch of day) {
                        if (found.findIndex((val: number) => val === batch.end) === -1) {
                            this.on_payload(coin, batch, {
                                open_price: -1,
                                low_price: -1,
                                high_price: -1,
                                close_price: -1,
                                volume: -1,
                                trade_number: -1,
                                taker_buy: -1
                            });
                        }
                    }

                } catch (e) {
                    this.addFail(e);
                    if (this.getFailCount() >= 10) {
                        this.cooldown(2);
                        this.teleport();
                        return;
                    } else {
                        this.log.warn(`[${new Date(Date.now())}] [Sleeping for 60s]`);
                        await Sleep(60 * 1000);
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
