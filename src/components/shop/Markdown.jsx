import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

// Product descriptions are Markdown. react-markdown never renders raw HTML,
// so admin-entered text cannot inject markup.
const isExternal = (href = '') => /^https?:\/\//i.test(href);

const components = {
  p: (props) => <p className="leading-relaxed" {...props} />,
  h2: (props) => <h2 className="font-sans text-tk-2xl font-light tracking-[-0.01em] pt-tk-4" {...props} />,
  h3: (props) => <h3 className="font-sans text-tk-xl font-light pt-tk-3" {...props} />,
  ul: (props) => <ul className="list-disc pl-5 space-y-tk-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 space-y-tk-1" {...props} />,
  strong: (props) => <strong className="font-medium" {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      className="underline underline-offset-4 hover:opacity-70"
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  ),
  img: () => null,
};

export default function Markdown({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={cn('space-y-tk-4', className)}>
      <ReactMarkdown components={components} skipHtml>
        {String(children)}
      </ReactMarkdown>
    </div>
  );
}
