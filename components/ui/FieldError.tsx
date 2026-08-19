export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
      {messages[0]}
    </p>
  );
}
