import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000"
const region = process.env.MINIO_REGION || "us-east-1"
const accessKeyId = process.env.MINIO_ROOT_USER || "texedo"
const secretAccessKey = process.env.MINIO_ROOT_PASSWORD || "texedo_minio_password"
const bucket = process.env.MINIO_BUCKET || "texedo"

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

async function ensureBucketExists() {
  try {
    await s3.send(
      new HeadBucketCommand({
        Bucket: bucket,
      })
    )
  } catch {
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucket,
      })
    )
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
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    })
  )
  if (!response.Body) {
    return null
  }
  return streamToString(response.Body as ReadableStream | NodeJS.ReadableStream)
}

export function getBucketName() {
  return bucket
}
