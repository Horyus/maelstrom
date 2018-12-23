import { Plugin }                            from '../Plugin';
import { IndexedBatchTimes, MissingBatches } from '../../types/BatchTimes';
import * as GTrendsAPI                       from 'google-trends-api';
import { sameHour }                          from '../../helpers/sameHour';
import { ShuffleArray }                      from '../../helpers/ShuffleArray';
import { Sleep }                             from '../../helpers/Sleep';
import { ConfigManager }                     from '../../config/ConfigManager';

interface GTrendsPayload {
    search: number;
}

interface GTrendsConfig {
    error_count: number;
    sleep: number;
    cooldown: number;
}

export class GTrends extends Plugin<GTrendsPayload> {

    private readonly plugin_config: GTrendsConfig;

    constructor() {
        super('gtrends', [
            {
                field_name: 'search',
                field_type: 'bigint'
            }
        ]);

        if (!ConfigManager.Instance._.gtrends) {
           this.plugin_config = {
               error_count: 10,
               sleep: 60,
               cooldown: 5
           };
        } else {
            this.plugin_config = {
                error_count: ConfigManager.Instance._.gtrends.error_count || 10,
                sleep: ConfigManager.Instance._.gtrends.sleep || 60,
                cooldown: ConfigManager.Instance._.gtrends.cooldown || 5,
            };
        }

    }

    public start(): void {
    }

    public stop(): void {
    }

    public async order(batches: MissingBatches): Promise<void> {
        const coin_list: string[] = Object.keys(batches);
        ShuffleArray(coin_list);
        for (const coin of coin_list) {
            if (!batches[coin].length) continue;

            const hours: IndexedBatchTimes[][] = [];
            let hour_idx: number = 0;

            // Sort the batches to have batches that are the same day together
            batches[coin] = batches[coin].sort((batch_left: IndexedBatchTimes, batch_right: IndexedBatchTimes): number =>
                batch_left.end - batch_right.end);

            // Create first day
            hours.push([]);
            hours[hour_idx].push(batches[coin][0]);
            const rest_batches: IndexedBatchTimes[] = batches[coin].slice(1);

            // Regroup batches that are on the same hour and same day
            for (const batch of rest_batches) {
                if (sameHour(hours[hour_idx][hours[hour_idx].length - 1].end, batch.end)) {
                    hours[hour_idx].push(batch);
                } else {
                    ++hour_idx;
                    hours.push([]);
                    hours[hour_idx].push(batch);
                }
            }

            // Every hour equals with 1 request
            for (const hour of hours) {
                let raw_data;
                try {
                    raw_data = await GTrendsAPI.interestOverTime({
                        keyword: this.coin_data[coin].gtrends.name,
                        startTime: new Date(hour[0].start - (60 * 60 * 1000)),
                        endTime: new Date(hour[hour.length - 1].end + (60 * 60 * 1000)),
                        granularTimeResolution: true
                    });

                    if (!raw_data) continue;

                    const data = JSON.parse(raw_data);

                    // Then we extract the specific data for every batch, and add up the values for the 5 minutes
                    for (const batch of hour) {

                        let val: number = 0;
                        let found: boolean = false;

                        for (let timeline_idx = 0; timeline_idx < data.default.timelineData.length; ++timeline_idx) {
                            if ((parseInt(data.default.timelineData[timeline_idx].time) * 1000) === batch.start && timeline_idx + 5 < data.default.timelineData.length) {
                                found = true;
                                for (let batch_idx = timeline_idx; batch_idx < timeline_idx + 5; ++batch_idx) {
                                    val += data.default.timelineData[batch_idx].value[0];
                                }
                                break;
                            }
                        }
                        if (found) {
                            this.on_payload(coin, batch, {
                                search: val
                            });
                        } else {
                            this.on_payload(coin, batch, {
                                search: -1
                            });
                        }

                    }

                } catch (e) {
                    this.addFail(e);
                    if (this.getFailCount() >= this.plugin_config.error_count) {
                        if (e.requestBody) {
                            this.log.warn(`[${new Date(Date.now())}] [${e.requestBody}]`);
                        }
                        this.cooldown(this.plugin_config.cooldown);
                        this.teleport();
                        GTrendsAPI.clearCookie();
                        return;
                    } else {
                        this.log.warn(`[${new Date(Date.now())}] [Sleeping for ${this.plugin_config.sleep}s]`);
                        await Sleep(this.plugin_config.sleep);
                    }
                }
            }

        }
    }

}
