import { spawn } from "child_process"
import path from "path"

async function testEmbeddings() {
  console.log("🧪 Probando generación de embeddings...")

  const testPDFs = [
    {
      url: "https://example.com/test.pdf", // Reemplaza con una URL real de prueba
      filename: "test.pdf",
    },
  ]

  const pythonScript = path.join(process.cwd(), "scripts", "generate_embeddings.py")
  const pdfDataJson = JSON.stringify(testPDFs)

  return new Promise((resolve) => {
    const pythonProcess = spawn("python", [pythonScript, pdfDataJson], {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      console.log("Python stderr:", data.toString())
    })

    pythonProcess.on("close", (code) => {
      console.log(`Python script terminó con código: ${code}`)

      if (code !== 0) {
        console.error("❌ Error:", stderr)
        resolve({ success: false, error: stderr })
        return
      }

      try {
        const result = JSON.parse(stdout)
        console.log("✅ Resultado:", result)
        resolve(result)
      } catch (parseError) {
        console.error("❌ Error parseando:", parseError)
        resolve({ success: false, error: "Error parseando resultado" })
      }
    })

    pythonProcess.on("error", (error) => {
      console.error("❌ Error ejecutando Python:", error)
      resolve({ success: false, error: error.message })
    })
  })
}

testEmbeddings()
