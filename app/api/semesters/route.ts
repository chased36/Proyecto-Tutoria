import { NextResponse } from "next/server"
import { getSemesters } from "@/lib/db"

export async function GET() {
  try {
    const semesters = await getSemesters()
    return NextResponse.json(semesters)
  } catch (error) {
    console.error("Error fetching semesters:", error)
    return NextResponse.json({ error: "Error al obtener semestres" }, { status: 500 })
  }
}
