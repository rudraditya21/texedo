function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Required environment variable "${name}" is not set. ` +
        `Copy .env.example to .env and fill in the values.`
    )
  }
  return value
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export const env = {
  // Database — either a full URL or individual parts
  databaseUrl: process.env.DATABASE_URL,
  postgresUser: process.env.POSTGRES_USER,
  postgresPassword: process.env.POSTGRES_PASSWORD,
  postgresHost: optionalEnv("POSTGRES_HOST", "localhost"),
  postgresPort: optionalEnv("POSTGRES_PORT", "5432"),
  postgresDb: optionalEnv("POSTGRES_DB", "texedo_db"),

  // Redis
  redisUrl: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  // MinIO / S3-compatible object storage
  minioEndpoint: optionalEnv("MINIO_ENDPOINT", "http://localhost:9000"),
  minioRegion: optionalEnv("MINIO_REGION", "us-east-1"),
  get minioRootUser() {
    return requireEnv("MINIO_ROOT_USER")
  },
  get minioRootPassword() {
    return requireEnv("MINIO_ROOT_PASSWORD")
  },
  minioBucket: optionalEnv("MINIO_BUCKET", "texedo"),

  // Optional API secret — if set, all API routes require Authorization: Bearer <secret>
  apiSecret: process.env.TEXEDO_API_SECRET,

  nodeEnv: optionalEnv("NODE_ENV", "development"),
} as const

export function getDbConnectionString(): string {
  if (env.databaseUrl) return env.databaseUrl

  const user = env.postgresUser
  const password = env.postgresPassword

  if (!user || !password) {
    throw new Error(
      "Database configuration missing. " +
        "Set DATABASE_URL or both POSTGRES_USER and POSTGRES_PASSWORD."
    )
  }

  return `postgresql://${user}:${password}@${env.postgresHost}:${env.postgresPort}/${env.postgresDb}`
}
