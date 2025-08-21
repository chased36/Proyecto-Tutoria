"use server"

import { authenticateUser, createUser, deleteUser, getUsers } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function loginAction(email: string, password: string) {
  console.log("🚀 Iniciando proceso de login para:", email)

  try {
    const user = await authenticateUser(email, password)

    if (user) {
      console.log("✅ Login exitoso para usuario:", user.nombre, "Rol:", user.role)
      return { success: true, user }
    } else {
      console.log("❌ Login fallido: credenciales incorrectas")
      return { success: false, error: "Credenciales incorrectas" }
    }
  } catch (error) {
    console.error("❌ Error en loginAction:", error)
    return { success: false, error: "Error del servidor" }
  }
}

export async function getUsersAction() {
  try {
    const users = await getUsers()
    return { success: true, users }
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    return { success: false, error: "Error del servidor" }
  }
}

export async function createUserAction(nombre: string, email: string, password: string) {
  try {
    const user = await createUser(nombre, email, password)
    revalidatePath("/admin/usuarios")
    return { success: true, user }
  } catch (error) {
    console.error("Error creando usuario:", error)
    return { success: false, error: "Error al crear usuario" }
  }
}

export async function deleteUserAction(id: string) {
  try {
    await deleteUser(id)
    revalidatePath("/admin/usuarios")
    return { success: true }
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    return { success: false, error: "Error al eliminar usuario" }
  }
}
