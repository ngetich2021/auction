import "server-only";
import Groq from "groq-sdk";

export const groq = new Groq();

export const GROQ_MODEL = "openai/gpt-oss-120b";
