export function getRoundedTime(time?: number): number {
    const now = time || Date.now();
    return now - (now % (5 * 60 * 1000));
}
