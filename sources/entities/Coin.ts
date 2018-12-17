import { Entity, BaseEntity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Coin extends BaseEntity {

    @PrimaryColumn()
    public name: string;

    @Column()
    public config: string;

    constructor(name?: string, config?: any) {
        super();
        this.name = name;
        this.config = JSON.stringify(config);
    }
}
