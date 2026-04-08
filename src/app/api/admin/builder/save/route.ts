import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, weights } = body;

    if (!name || !description || !weights) {
      return NextResponse.json(
        { error: "Missing name, description, or weights" },
        { status: 400 }
      );
    }

    // Validate weights sum
    const weightSum = Object.values(weights as Record<string, number>).reduce(
      (a, b) => a + b,
      0
    );
    if (weightSum < 0.95 || weightSum > 1.05) {
      return NextResponse.json(
        {
          error: `Weights sum to ${weightSum.toFixed(3)}, must be between 0.95 and 1.05`,
        },
        { status: 400 }
      );
    }

    // Validate gate/weight consistency
    if (weights.futuresMarket > 0 && !body.enableFutures) {
      return NextResponse.json(
        { error: "enableFutures must be true when futuresMarket weight > 0" },
        { status: 400 }
      );
    }
    if (weights.restFactor > 0 && !body.enableRestFactor) {
      return NextResponse.json(
        { error: "enableRestFactor must be true when restFactor weight > 0" },
        { status: 400 }
      );
    }
    if (weights.playerMomentum > 0 && !body.enablePlayerMomentum) {
      return NextResponse.json(
        {
          error:
            "enablePlayerMomentum must be true when playerMomentum weight > 0",
        },
        { status: 400 }
      );
    }

    const config = {
      weights,
      homeIceBonus: body.homeIceBonus ?? 2,
      enableStarPower: body.enableStarPower ?? false,
      enableFutures: body.enableFutures ?? false,
      enableStartingGoalies: body.enableStartingGoalies ?? false,
      enablePlayerMomentum: body.enablePlayerMomentum ?? false,
      enableRestFactor: body.enableRestFactor ?? false,
      confidenceMultiplier: body.confidenceMultiplier ?? 3,
    };

    const saved = await prisma.customModel.create({
      data: {
        name,
        description,
        config,
        createdBy: session.email,
      },
    });

    return NextResponse.json({ id: saved.id, name: saved.name });
  } catch (error) {
    console.error("Save model error:", error);
    return NextResponse.json(
      { error: "Failed to save model" },
      { status: 500 }
    );
  }
}
