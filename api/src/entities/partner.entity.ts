import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import JobEntity from './job.entity';

@Entity({ name: 'partner' })
export default class PartnerEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 300 })
    name: string;

    @Column({ type: 'jsonb' })
    config: { appUrl: string, env1: string, env2: string };

    @ManyToMany(() => JobEntity, (jobEntity) => jobEntity.partners)
    @JoinTable()
    jobs: JobEntity[];

    addJob (job: JobEntity) {
        if (!this.jobs) {
            this.jobs = [];
        }
        this.jobs.push(job);
    }

}
