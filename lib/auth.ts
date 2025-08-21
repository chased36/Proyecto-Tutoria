import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export type User = {
  id: string
  nombre: string
  email: string
  created_at: string
  role?: "admin" | "editor"
}

// Funciones para usuarios
export async function getUsers(): Promise<User[]> {
  const result = await sql`
    SELECT id, nombre, email, created_at 
    FROM usuarios 
    ORDER BY created_at DESC
  `
  return result.map((user) => ({
    ...user,
    role: user.email === "admin@admin.com" ? "admin" : "editor",
  })) as User[]
}

export async function createUser(nombre: string, email: string, password: string): Promise<User> {
  // Hashear la contraseña con bcrypt
  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await sql`
    INSERT INTO usuarios (id, nombre, email, password, created_at)
    VALUES (gen_random_uuid(), ${nombre}, ${email}, ${hashedPassword}, NOW())
    RETURNING id, nombre, email, created_at
  `

  const user = result[0] as User
  user.role = user.email === "admin@admin.com" ? "admin" : "editor"
  return user
}

export async function deleteUser(id: string): Promise<void> {
  await sql`DELETE FROM usuarios WHERE id = ${id}`
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  console.log("🔐 Intentando autenticar usuario:", email)

  try {
    const result = await sql`
      SELECT id, nombre, email, password, created_at 
      FROM usuarios 
      WHERE email = ${email}
    `

    console.log("📊 Usuarios encontrados:", result.length)

    if (result.length === 0) {
      console.log("❌ Usuario no encontrado")
      return null
    }

    const user = result[0]
    console.log("👤 Usuario encontrado:", { id: user.id, nombre: user.nombre, email: user.email })

    // Verificar la contraseña con bcrypt
    console.log("🔑 Verificando contraseña...")
    const isValidPassword = await bcrypt.compare(password, user.password)

    console.log("✅ Contraseña válida:", isValidPassword)

    if (!isValidPassword) {
      console.log("❌ Contraseña incorrecta")
      return null
    }

    console.log("✅ Autenticación exitosa")

    // Retornar usuario sin la contraseña y con rol
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      created_at: user.created_at,
      role: user.email === "admin@admin.com" ? "admin" : "editor",
    } as User
  } catch (error) {
    console.error("❌ Error en autenticación:", error)
    return null
  }
}

export async function getUsersCount(): Promise<number> {
  const result = await sql`SELECT COUNT(*) as count FROM usuarios`
  return Number(result[0].count)
}
