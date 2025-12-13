import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  variant: "assistant" | "user";
}

export function MarkdownRenderer({ content, variant }: MarkdownRendererProps) {
  return (
    <div className="markdown-content [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className={
              variant === "user" 
                ? "underline text-white hover:text-blue-100" 
                : "underline text-blue-600 hover:text-blue-800"
            }
          >
            {children}
          </a>
        ),


        p: ({ children }) => (
          <p className="mb-1 last:mb-0 leading-relaxed text-sm sm:text-base">
            {children}
          </p>
        ),

        h1: ({ children }) => (
          <h1 className="text-lg sm:text-xl font-bold mt-2 mb-1 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base sm:text-lg font-semibold mt-2 mb-1 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm sm:text-base font-medium mt-1 mb-0.5 first:mt-0">
            {children}
          </h3>
        ),

        // Lists - tighter spacing
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-1 space-y-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-1 space-y-0">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">
            {children}
          </li>
        ),

        // Blockquotes - reduced spacing
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 py-1 mb-1 italic text-gray-700 bg-gray-50 rounded-r">
            {children}
          </blockquote>
        ),

        // Code blocks and inline code
        code: ({ children, className }) => {
          const isBlock = typeof className === "string" && className.includes("language-");
          if (isBlock) {
            return (
              <code className="block font-mono text-sm">
                {children}
              </code>
            );
          }
          return (
            <code
              className={`rounded px-1 py-0.5 font-mono text-xs ${
                variant === "user" 
                  ? "bg-white/20 text-white" 
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
            {children}
          </pre>
        ),

        // Tables
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-gray-200 px-2 py-1 text-left font-semibold text-gray-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-gray-100 px-2 py-1 align-top">
            {children}
          </td>
        ),

        // Horizontal rules
        hr: () => (
          <hr className="my-2 border-gray-200" />
        ),

        // Strong and emphasis
        strong: ({ children }) => (
          <strong className="font-semibold">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic">
            {children}
          </em>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
