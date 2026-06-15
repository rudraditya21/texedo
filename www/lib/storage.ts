import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { env } from "@/lib/env"

const s3 = new S3Client({
  region: env.minioRegion,
  endpoint: env.minioEndpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.minioRootUser,
    secretAccessKey: env.minioRootPassword,
  },
})

const bucket = env.minioBucket

async function ensureBucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

async function streamToString(stream: ReadableStream | NodeJS.ReadableStream) {
  if (typeof (stream as ReadableStream).getReader === "function") {
    const reader = (stream as ReadableStream).getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    return Buffer.concat(chunks).toString("utf8")
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    const nodeStream = stream as NodeJS.ReadableStream
    nodeStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    nodeStream.on("error", reject)
    nodeStream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
  })
}

export async function uploadTextObject(objectKey: string, content: string) {
  await ensureBucketExists()
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: content,
      ContentType: "text/plain; charset=utf-8",
    })
  )
  return { bucket, objectKey }
}

export async function getTextObject(objectKey: string) {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectKey })
  )
  if (!response.Body) return null
  return streamToString(response.Body as ReadableStream | NodeJS.ReadableStream)
}

export function getBucketName() {
  return bucket
}

export async function checkBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    return true
  } catch {
    return false
  }
}
