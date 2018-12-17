import { Entity, BaseEntity, PrimaryColumn, Column } from 'typeorm';
import { Coin }                                      from './Coin';

@Entity()
export class DatasetInfos extends BaseEntity {

    @PrimaryColumn()
    public Id: string;

    @Column()
    public coin: string;

    @Column()
    public start_time: Date;

    @Column({nullable: true})
    public end_time: Date;

    constructor(id?: string, coin?: Coin, start_time?: Date) {
        super();
        this.Id = id;
        if (coin) {
            this.coin = coin.name;
        }
        this.start_time = start_time;
        this.end_time = null;
    }
}
