import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncHistoryBatch, settlePendingProps } from "@/lib/history";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncHistoryBatch({ batchSize: 14 });
    const props = await settlePendingProps({ limit: 200 });

    revalidatePath("/history");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      remaining: result.remaining,
      dates: result.dates,
      props,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("History sync cron failed:", error);
    return NextResponse.json(
      { error: "Failed to sync history" },
      { status: 500 }
    );
  }
}
