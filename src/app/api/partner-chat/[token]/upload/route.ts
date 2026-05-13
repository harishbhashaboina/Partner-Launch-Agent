import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { promises as fs } from "fs";
import path from "path";
import { getPartnerByChatToken } from "@/lib/storage";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const partner = await getPartnerByChatToken(params.token);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file" }, { status: 400 });

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const id = nanoid(10);
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 100);
  const storedName = `${id}-${safeName}`;
  const fullPath = path.join(UPLOAD_DIR, storedName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buf);

  let excerpt: string | undefined;
  if (
    file.type.startsWith("text/") ||
    /\.(md|txt|json|yaml|yml|xml)$/i.test(file.name)
  ) {
    try {
      excerpt = buf.toString("utf8").slice(0, 600);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    attachment: {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      excerpt,
    },
  });
}
