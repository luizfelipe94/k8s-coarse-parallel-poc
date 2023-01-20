import boto3
import json
import time

sqs = boto3.client('sqs', 
                    endpoint_url='http://192.168.1.10:9324',
                    aws_access_key_id='anything',
                    aws_secret_access_key='anything',
                    region_name='us-east-1')

def process_message(message_body):
    print("#########################################")
    body = json.loads(message_body);
    print(f"JOB ID: {body['jobId']}")
    print(f"JOB ID: {body['partner']['name']}")
    print("#########################################")

if __name__ == "__main__":
    print('Starting job...')
    response = sqs.receive_message(
        QueueUrl='http://192.168.1.10:9324/queue/pending-transactions',
        AttributeNames=[
            'SentTimestamp'
        ],
        MaxNumberOfMessages=1,
        MessageAttributeNames=[
            'All'
        ],
        VisibilityTimeout=0,
        WaitTimeSeconds=0
    )
    for message in response['Messages']:
        try:
            process_message(message['Body'])
            sqs.delete_message(
                QueueUrl='http://192.168.1.10:9324/queue/pending-transactions',
                ReceiptHandle=message['ReceiptHandle']
            )
            time.sleep(20)
            print('Job finished')
        except Exception as e:
            print(f"exception while processing message: {repr(e)}")
            continue