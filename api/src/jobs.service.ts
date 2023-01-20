import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SqsService } from "@ssut/nestjs-sqs";
import { AppService } from "./app.service";
import PartnerEntity from "./entities/partner.entity";
import { v4 as uuid } from 'uuid';
import * as K8S from '@kubernetes/client-node';
import * as yaml from "js-yaml";
import * as nodemailer from "nodemailer";

type JobPayload = {
    partner: PartnerEntity,
    jobId: string,
    executionId: string
};

@Injectable()
export default class JobsService {

    private readonly logger = new Logger(JobsService.name);
    private readonly client: K8S.KubernetesObjectApi;

    constructor(
        private readonly appService: AppService,
        private readonly sqsService: SqsService
    ) {
        const kc = new K8S.KubeConfig();
        kc.loadFromDefault();
        this.client = K8S.KubernetesObjectApi.makeApiClient(kc);
    }

    @Cron('*/1 * * * *')
    async renovacaoCesta() {
        const executionId = uuid();
        this.logger.log(`renovacao cesta de serviços. executionId ${executionId}`);
        const partners = await this.appService.getPartnerJobs('renovacao-cesta');
        if (!partners.length) {
            this.logger.log(`No partners to execute. exectuionId ${executionId}`);
            return;
        }
        const image = 'luizlipefs/maas-renovacao-cesta:1.0.3';
        const jobName = 'renovacao-cesta';
        for (const partner of partners) {
            const payload: JobPayload = { partner, jobId: uuid(), executionId }
            await this.sqsService.send('renovacao-cesta', { id: payload.jobId, body: payload });
        }
        await this.launchJob(image, jobName, partners.length, executionId);
        await this.sendMail(jobName, partners.map((p) => p.name));
    }

    @Cron('*/1 * * * *')
    async pendingTransactions() {
        const executionId = uuid();
        this.logger.log(`transacoes pendentes. executionId ${executionId}`);
        const partners = await this.appService.getPartnerJobs('pending-transactions');
        if (!partners.length) {
            this.logger.log(`No partners to execute. exectuionId ${executionId}`);
            return;
        }
        const image = 'luizlipefs/maas-pending-transactions:1.0.2';
        const jobName = 'pending-transactions';
        for (const partner of partners) {
            const payload: JobPayload = { partner, jobId: uuid(), executionId }
            await this.sqsService.send('pending-transactions', { id: payload.jobId, body: payload });
        }
        await this.launchJob(image, jobName, partners.length, executionId);
        await this.sendMail(jobName, partners.map((p) => p.name));
    }

    private async launchJob (image: string, jobName: string, completions: number, execId: string): Promise<void> {
        const jobTemplate = this.buildJobTemplate(image, jobName, completions);
        let spec = yaml.load(jobTemplate);
        spec = this.formatSpec(spec);
        let res;
        try {
            // await this.client.read(spec);
            res = await this.client.patch(spec);
        } catch (error) {
            res = await this.client.create(spec);
        }
        this.logger.log(`job submitted!`, res.response.statusCode);

    }

    private buildJobTemplate (image: string, jobName: string, completions: number): string {
        return `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: maas-job-${jobName}
        spec:
          ttlSecondsAfterFinished: 20
          completions: ${completions}
          parallelism: 2
          template:
            metadata:
              name: maas-job-${jobName}
            spec:
              containers:
              - name: maas-${jobName}
                image: ${image}
              restartPolicy: Never
        `
    }

    private formatSpec(spec: K8S.KubernetesObject): K8S.KubernetesObject {
        spec.metadata = spec.metadata || {};
        spec.metadata.annotations = spec.metadata.annotations || {};
        delete spec.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"];
        spec.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"] = JSON.stringify(spec);
        return spec;
    }

    private async sendMail (jobName: string, partners: string[]): Promise<void> {
        const transporter = nodemailer.createTransport({
            host: '192.168.1.10',
            port: 1025,
            secure: false,
            tls: { rejectUnauthorized: false }
        });
        await transporter.sendMail({
            from: 'cp@maas.com.br',
            to: 'cp@maas.com.br',
            subject: `job submited ${jobName}`,
            text: `
                Job submetido para execução \n
                ${JSON.stringify(partners)}
            `
        });
    }

}