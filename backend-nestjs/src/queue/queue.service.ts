import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient
} from "@aws-sdk/client-sqs";
import { AppConfigService } from "../config/config.service";
import { QueueJobMessage, ReceivedQueueMessage } from "./queue-message";

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly sqs: SQSClient;
  private queueUrl: string | undefined;
  private enabled = false;

  constructor(private readonly config: AppConfigService) {
    this.sqs = new SQSClient({
      region: this.config.sqs.region,
      endpoint: this.config.sqs.endpoint,
      credentials: this.config.sqs.endpoint
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test"
          }
        : undefined
    });
  }

  async onModuleInit(): Promise<void> {
    this.enabled = Boolean(this.config.sqs.queueUrl || this.config.sqs.endpoint || this.config.sqs.queueName);
    if (!this.enabled) {
      this.logger.log("Queue is not configured; queued job routes are disabled for this runtime");
      return;
    }

    this.queueUrl = await this.resolveQueueUrl();
  }

  async send(message: QueueJobMessage): Promise<void> {
    if (!this.enabled) {
      throw new Error("Queue is not configured");
    }

    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.getQueueUrl(),
        MessageBody: JSON.stringify(message)
      })
    );
  }

  async receive(): Promise<ReceivedQueueMessage[]> {
    if (!this.enabled) {
      return [];
    }

    const response = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.getQueueUrl(),
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: this.config.sqs.waitTimeSeconds,
        VisibilityTimeout: this.config.sqs.visibilityTimeoutSeconds
      })
    );

    return (response.Messages ?? []).flatMap((message) => this.parseReceivedMessage(message));
  }

  async delete(receiptHandle: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.sqs.send(
      new DeleteMessageCommand({
        QueueUrl: this.getQueueUrl(),
        ReceiptHandle: receiptHandle
      })
    );
  }

  private async resolveQueueUrl(): Promise<string> {
    if (this.config.sqs.queueUrl) {
      return this.config.sqs.queueUrl;
    }

    if (!this.config.sqs.queueName) {
      throw new Error("SQS_QUEUE_NAME is required when SQS_QUEUE_URL is not set");
    }

    try {
      const existing = await this.sqs.send(new GetQueueUrlCommand({ QueueName: this.config.sqs.queueName }));
      if (existing.QueueUrl) {
        return existing.QueueUrl;
      }
    } catch {
      this.logger.log(`SQS queue ${this.config.sqs.queueName} not found; creating it`);
    }

    const created = await this.sqs.send(new CreateQueueCommand({ QueueName: this.config.sqs.queueName }));
    if (!created.QueueUrl) {
      throw new Error(`Unable to resolve SQS queue URL for ${this.config.sqs.queueName}`);
    }

    return created.QueueUrl;
  }

  private getQueueUrl(): string {
    if (!this.queueUrl) {
      throw new Error("SQS queue URL is not initialized");
    }

    return this.queueUrl;
  }

  private parseReceivedMessage(message: Message): ReceivedQueueMessage[] {
    if (!message.Body || !message.ReceiptHandle) {
      return [];
    }

    try {
      return [
        {
          body: JSON.parse(message.Body) as QueueJobMessage,
          receiptHandle: message.ReceiptHandle
        }
      ];
    } catch (error) {
      this.logger.warn(`Skipping invalid SQS message: ${(error as Error).message}`);
      return [];
    }
  }
}
