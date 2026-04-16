import dotenv from "dotenv"
import http from "http"
import connectDB from "./db/index.js"
import app from "./app.js"
import { initSocket } from "./socket.js"
import { startCleanupJob } from "./jobs/cleanup.job.js"

dotenv.config({
  path: "./.env"
})

const server = http.createServer(app)
initSocket(server)

connectDB()
  .then(() => {

    const PORT = process.env.PORT || 8000

    // Initialize background jobs
startCleanupJob()

server.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`)
    })

  })
  .catch((err) => {
    console.error("MongoDB connection failed !!!", err)
  })