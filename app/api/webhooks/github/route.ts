import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = "sha256=" + Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expected;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const valid = await verifySignature(req, body);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload = JSON.parse(body);
  const repoFullName: string = payload.repository?.full_name;
  const commits: Array<{
    id: string;
    message: string;
    author: { name: string };
    timestamp: string;
  }> = payload.commits ?? [];

  if (!repoFullName || commits.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("github_repo", repoFullName)
    .single();

  if (!project) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no matching project" });
  }

  const logs = commits.map((commit) => ({
    project_id: project.id,
    user_id: project.user_id,
    log_date: commit.timestamp.slice(0, 10),
    content: `[${commit.id.slice(0, 7)}] ${commit.message.trim()}\n작성자: ${commit.author.name}`,
  }));

  const { error } = await supabase.from("project_logs").insert(logs);

  if (error) {
    console.error("project_logs insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: logs.length });
}
