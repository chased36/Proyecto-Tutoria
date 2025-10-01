import { NextResponse } from "next/server"
import { getSubjectsBySemester } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")

    if (!semesterId) {
      return NextResponse.json({ error: "Se requiere semesterId" }, { status: 400 })
    }

    const subjects = await getSubjectsBySemester(semesterId)
    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json({ error: "Error al obtener asignaturas" }, { status: 500 })
  }
}
