import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import PartnerEntity from "./partner.entity";

@Entity({ name: 'job' })
export default class JobEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 300 })
    name: string;

    @Column({ type: 'varchar', length: 300 })
    description: string;

    @ManyToMany(() => PartnerEntity, (partnerEntity) => partnerEntity.jobs)
    partners: PartnerEntity[]

}