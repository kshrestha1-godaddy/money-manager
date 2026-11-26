/**
 * Renders assistant and user chat messages written in markdown.
 *
 * Every element is styled explicitly so the output does not depend on a
 * typography plugin being present.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  variant: "assistant" | "user";
}

/**
 * Paragraph spacing inside list items.
 *
 * A markdown list is "loose" when its items are separated by blank lines, and
 * remark then wraps each item's content in a `<p>`. Those paragraphs must not
 * carry the default bottom margin, or every bullet gains a gap under it.
 */
const LIST_ITEM_PARAGRAPH = "[&>p]:mb-0 [&>p:not(:last-child)]:mb-2";

export function MarkdownRenderer({ content, variant }: MarkdownRendererProps) {
  return (
    <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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

          // Paragraphs – a bit more space between sections
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed text-sm sm:text-base">
              {children}
            </p>
          ),

          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-bold mt-5 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-semibold mt-5 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold mt-4 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0">
              {children}
            </h4>
          ),

          // Lists — markers sit outside the content box so that a loose list,
          // whose items remark wraps in <p>, keeps its text beside the marker
          // instead of below it.
          ul: ({ children }) => (
            <ul className="list-disc list-outside mb-3 last:mb-0 space-y-1 pl-5 marker:text-gray-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside mb-3 last:mb-0 space-y-1 pl-5 marker:text-gray-400 marker:font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={`leading-relaxed pl-1 text-sm sm:text-base ${LIST_ITEM_PARAGRAPH}`}>
              {children}
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 py-1 mb-3 italic text-gray-700 bg-gray-50 rounded-r">
              {children}
            </blockquote>
          ),

          code: ({ children, className }) => {
            const isBlock =
              typeof className === "string" && className.includes("language-");
            if (isBlock) {
              return <code className="block font-mono text-sm">{children}</code>;
            }
            return (
              <code
                className={`rounded px-1 py-0.5 font-mono text-xs ${variant === "user"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-800"
                  }`}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
              {children}
            </pre>
          ),

          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
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

          hr: () => <hr className="my-3 border-gray-200" />,

          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}