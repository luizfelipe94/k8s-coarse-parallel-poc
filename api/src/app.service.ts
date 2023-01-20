import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JobEntity from './entities/job.entity';
import PartnerEntity from './entities/partner.entity';

@Injectable()
export class AppService {

  constructor(
    @InjectRepository(PartnerEntity) private partnerRepository: Repository<PartnerEntity>,
    @InjectRepository(JobEntity) private jobRepository: Repository<JobEntity>
  ) {}

  async getHello(): Promise<string> {
    const job1 = new JobEntity();
    job1.name = 'renovacao-cesta';
    job1.description = 'Renovação de cesta de serviços';
    const job2 = new JobEntity();
    job2.name = 'pending-transactions';
    job2.description = 'Pagamento de transações pendentes';
    await this.jobRepository.save([job1, job2]);

    const partner1 = new PartnerEntity();
    partner1.name = 'Seu Banco 1';
    partner1.config = { appUrl: 'http://localhost:3001/p1', env1: 'val2', env2: 'val2' };
    partner1.addJob(job1)
    partner1.addJob(job2)

    const partner2 = new PartnerEntity();
    partner2.name = 'Seu Banco 2';
    partner2.config = { appUrl: 'http://localhost:3001/p2', env1: 'val2', env2: 'val2' };
    partner2.addJob(job1);

    await this.partnerRepository.save([partner1, partner2]);

    return 'Hello World!';
  }

  async getPartnerJobs (jobName: string): Promise<PartnerEntity[]> {
    return await this.partnerRepository.find({ where: { jobs: { name: jobName } }, relations: { jobs: true } });
  }
}
