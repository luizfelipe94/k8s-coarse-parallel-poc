package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sqs"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type Job struct {
	JobId   string `json:"jobId"`
	Partner struct {
		PartnerId   string `json:"id"`
		PartnerName string `json:"name"`
		Config      struct {
			AppUrl string `json:"appUrl"`
		} `json:"config"`
	} `json:"partner"`
}

var (
	sqsSvc *sqs.SQS
)

func renovacaoCesta(msg *sqs.Message) {
	job := Job{}
	json.Unmarshal([]byte(*msg.Body), &job)
	fmt.Println("#########################################")
	log.Println("JOB ID: ", job.JobId)
	log.Println("PARTNER: ", job.Partner.PartnerName)
	fmt.Println("#########################################")

	ctx := context.TODO()
	opts := options.Client().ApplyURI(job.Partner.Config.AppUrl)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		panic(err)
	}

	defer client.Disconnect(ctx)
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		panic(err)
	}
}

func main() {
	log.Println("Starting job...")
	sess, err := session.NewSession(&aws.Config{
		Endpoint:    aws.String("http://192.168.1.10:9324"),
		Region:      aws.String("us-east-1"),
		Credentials: credentials.AnonymousCredentials,
	})
	if err != nil {
		panic(err)
	}
	sqsSvc = sqs.New(sess)
	output, err := sqsSvc.ReceiveMessage(&sqs.ReceiveMessageInput{
		QueueUrl:            aws.String("http://192.168.1.10:9324/queue/renovacao-cesta"),
		MaxNumberOfMessages: aws.Int64(1),
		WaitTimeSeconds:     aws.Int64(15),
	})
	if err != nil {
		fmt.Println("failed to fetch sqs message", err)
	}
	for _, message := range output.Messages {
		renovacaoCesta(message)
		_, err := sqsSvc.DeleteMessage(&sqs.DeleteMessageInput{
			QueueUrl:      aws.String("http://192.168.1.10:9324/queue/renovacao-cesta"),
			ReceiptHandle: message.ReceiptHandle,
		})
		if err != nil {
			fmt.Println("failed to delete message", err)
		}
	}
	time.Sleep(time.Second * 30)
	log.Println("Job finished")

}
