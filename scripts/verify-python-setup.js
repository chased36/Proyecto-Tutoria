import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import os from "os"

async function verifyPythonSetup() {
  console.log("🔍 Verificando configuración de Python...")

  const isWindows = os.platform() === "win32"
  const venvPath = path.join(process.cwd(), "scripts", "venv")

  // Verificar si existe el entorno virtual
  if (!fs.existsSync(venvPath)) {
    console.log("❌ Entorno virtual no encontrado")
    console.log("💡 Ejecuta el script de configuración:")
    console.log(isWindows ? "   scripts/setup-python-env.bat" : "   bash scripts/setup-python-env.sh")
    return false
  }

  console.log("✅ Entorno virtual encontrado")

  // Verificar dependencias
  const checkScript = path.join(process.cwd(), "scripts", "check_dependencies.py")

  let pythonCommand, pythonArgs

  if (isWindows) {
    const venvPython = path.join(venvPath, "Scripts", "python.exe")
    pythonCommand = venvPython
    pythonArgs = [checkScript]
  } else {
    pythonCommand = "bash"
    pythonArgs = ["-c", `source ${path.join(venvPath, "bin", "activate")} && python ${checkScript}`]
  }

  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonCommand, pythonArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWindows,
    })

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString()
      stdout += output
      console.log(output.trim())
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      console.error("Error:", data.toString())
    })

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log("🎉 Configuración de Python verificada correctamente")
        resolve(true)
      } else {
        console.log("❌ Problemas en la configuración de Python")
        resolve(false)
      }
    })

    pythonProcess.on("error", (error) => {
      console.error("❌ Error ejecutando verificación:", error.message)
      resolve(false)
    })
  })
}

verifyPythonSetup()
