import { BatchTimes } from '../types/BatchTimes';

export function getBatchTime(time: number): BatchTimes {
    return {
        start: time - (5 * 60 * 1000),
        end: time
    };
}
