import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import JobsService from './jobs.service';
import JobEntity from './entities/job.entity';
import PartnerEntity from './entities/partner.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SQS } from 'aws-sdk';

const sqs = new SQS({
  credentials: { accessKeyId: 'anything', secretAccessKey: 'anything' },
  endpoint: 'http://localhost:9324',
  region: 'us-east-1'
})

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'postgres',
      database: 'maas',
      synchronize: true,
      entities: [join(__dirname, '**', '*.entity.{ts,js}')]
    }),
    TypeOrmModule.forFeature([PartnerEntity, JobEntity]),
    ScheduleModule.forRoot(),
    SqsModule.register({
      producers: [
        {
          name: 'pending-transactions',
          queueUrl: 'http://localhost:9324/queue/pending-transactions',
          sqs
        },
        {
          name: 'renovacao-cesta',
          queueUrl: 'http://localhost:9324/queue/renovacao-cesta',
          sqs
        }
      ]
    })
  ],
  controllers: [AppController],
  providers: [AppService, JobsService],
  exports: [TypeOrmModule]
})
export class AppModule {}
