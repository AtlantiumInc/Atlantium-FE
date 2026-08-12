import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown renderer for the content platform — no raw HTML ever. */
export function ContentMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none
      prose-headings:font-semibold prose-headings:tracking-tight
      prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
      prose-code:text-cyan-300 prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-card/60 prose-pre:border prose-pre:border-border/40
      prose-blockquote:border-l-cyan-500/40 prose-img:rounded-xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
