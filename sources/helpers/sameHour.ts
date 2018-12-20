export function sameHour(one: number, two: number): boolean {
    const date_one: Date = new Date(one);
    const date_two: Date = new Date(two);

    return ((date_one.getFullYear() === date_two.getFullYear())
        && (date_one.getMonth() === date_two.getMonth())
        && (date_one.getDate() === date_two.getDate())
        && date_one.getHours() === date_two.getHours());
}
