import Anthropic from "@anthropic-ai/sdk";
import { describePrompt, templateDescription, type DescribeInput } from "@/lib/describe";
import { requireApiUser } from "@/lib/session";

// Writes the marketing description. Uses Claude when ANTHROPIC_API_KEY is set,
// otherwise falls back to a template built from the same facts (and says so).
export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  let input: DescribeInput;
  try {
    input = (await req.json()) as DescribeInput;
  } catch {
    return Response.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ text: templateDescription(input), source: "template" });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: describePrompt(input) }],
    });
    if (response.stop_reason === "refusal") throw new Error("refused");
    const text = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    if (!text) throw new Error("empty");
    return Response.json({ text, source: "ai" });
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`describe: API error ${error.status}`);
    return Response.json({ text: templateDescription(input), source: "template" });
  }
}
