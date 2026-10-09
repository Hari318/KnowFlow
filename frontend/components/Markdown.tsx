import ReactMarkdown from "react-markdown";

// Renders model output (which often contains **bold**, lists, `code`) using the
// app's theme tokens. Raw HTML in the text is NOT rendered (react-markdown's default).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm text-foreground break-words">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          h1: ({ children }) => (
            <h3 className="text-base font-semibold mt-3">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-base font-semibold mt-3">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-semibold mt-2">{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-auto rounded bg-background p-3 text-xs">
              {children}
            </pre>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}