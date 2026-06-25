import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/utils";

type MarkdownContentProps = {
  content: string;
  inverted?: boolean;
};

export function MarkdownContent({ content, inverted }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ className, ...props }) => (
          <p className={cn("mb-3 last:mb-0", className)} {...props} />
        ),
        strong: ({ className, ...props }) => (
          <strong className={cn("font-semibold", className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol className={cn("mb-3 list-decimal space-y-2 pl-5 last:mb-0", className)} {...props} />
        ),
        ul: ({ className, ...props }) => (
          <ul className={cn("mb-3 list-disc space-y-2 pl-5 last:mb-0", className)} {...props} />
        ),
        li: ({ className, ...props }) => (
          <li
            className={cn(
              "pl-1 marker:text-muted-foreground",
              inverted && "marker:text-primary-foreground/70",
              className,
            )}
            {...props}
          />
        ),
        code: ({ className, ...props }) => (
          <code
            className={cn(
              "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]",
              inverted && "bg-primary-foreground/15",
              className,
            )}
            {...props}
          />
        ),
        pre: ({ className, ...props }) => (
          <pre
            className={cn(
              "mb-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        a: ({ className, ...props }) => (
          <a
            className={cn("font-medium underline underline-offset-4", className)}
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
