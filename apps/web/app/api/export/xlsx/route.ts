import { getVerifiedUserIdForDataAccess } from "../../../utils/auth";
import { sanitizeExportDateStrForFilename } from "../../../utils/exportFilename";
import { parseExportTableIds } from "../../../actions/export-table-catalog.shared";
import { buildUserExportXlsxBuffer } from "../../../services/user-primary-export-xlsx";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const body = await request.json();
    const tables = parseExportTableIds(body?.tables);

    if (!tables) {
      return Response.json(
        { error: "Invalid or empty tables selection" },
        { status: 400 }
      );
    }

    const dateStr = sanitizeExportDateStrForFilename(
      new Date().toISOString().slice(0, 10)
    );

    const { buffer, filename } = await buildUserExportXlsxBuffer(userId, dateStr, {
      tables,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/export/xlsx", error);
    return Response.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}
