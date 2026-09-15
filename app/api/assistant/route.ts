import { NextResponse } from "next/server";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { buildSystemPrompt, extractNavigation, type AssistantMessage } from "@/lib/assistant";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

function isValidHistory(value: unknown): value is AssistantMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGES &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        m.content.length <= MAX_MESSAGE_LENGTH
    )
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidHistory(messages)) {
    return NextResponse.json({ error: "Invalid message history." }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
      temperature: 0.4,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: "The assistant didn't respond. Please try again." }, { status: 502 });
    }

    const { text, navigate } = extractNavigation(reply);
    return NextResponse.json({ text, navigate });
  } catch (error) {
    console.error("Assistant request failed", error);
    return NextResponse.json({ error: "The assistant is unavailable right now. Please try again shortly." }, { status: 502 });
  }
}
