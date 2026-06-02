import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var adminInitialized: boolean | undefined
}

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

let connectionPromise: Promise<typeof mongoose> | null = null

async function dbConnectSimple() {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      })
      .then(async (conn) => {
        if (!global.adminInitialized) {
          global.adminInitialized = true
          const { initializeAdmin } = await import('./initAdmin')
          await initializeAdmin()
        }
        return conn
      })
      .catch((err) => {
        connectionPromise = null
        throw err
      })
  }

  return connectionPromise
}

export default dbConnectSimple
