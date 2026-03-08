export const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-bounce" />
    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-bounce [animation-delay:0.2s]" />
    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-bounce [animation-delay:0.4s]" />
  </div>
);
