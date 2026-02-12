"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

const plugins = { code };

interface MarkdownResponseProps {
  children: string;
  isStreaming?: boolean;
}

export function MarkdownResponse({
  children,
  isStreaming = false,
}: MarkdownResponseProps) {
  return (
    <Streamdown
      isAnimating={isStreaming}
      caret={isStreaming ? "block" : undefined}
      plugins={plugins}
    >
      {children}
    </Streamdown>
  );
}
