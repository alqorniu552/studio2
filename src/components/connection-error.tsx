
'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

// A client component to nicely format multi-line error messages.
export function ConnectionError({ message }: { message: string }) {
  const lines = message.split('\n').filter(line => line.trim() !== '');

  // Handle simple, single-line errors
  if (lines.length <= 1) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Gagal Terhubung</AlertTitle>
        <AlertDescription>
          <pre className="text-xs whitespace-pre-wrap font-sans">{message}</pre>
        </AlertDescription>
      </Alert>
    )
  }

  // Handle structured, multi-line errors
  const title = lines.shift() || "Terjadi kesalahan";
  const isChecklist = lines.some(line => /^\d+\./.test(line.trim()));

  return (
    <Alert variant="destructive">
      <Terminal className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {isChecklist ? (
          <ul className="mt-4 space-y-3 text-xs font-sans">
            {lines.map((line, index) => {
              // This will render text with `<code>` tags properly
              const parts = line.replace(/^\d+\.\s*/, '').trim().split(/(`[^`]+`)/g);
              const isHeader = line.endsWith(':');
              
              return (
                <li key={index} className="flex">
                  {isHeader ? <></> : <span className="mr-2">✔️</span> }
                  <div className={isHeader ? 'font-bold -ml-5 mb-1' : ''}>
                  {parts.map((part, i) =>
                    part.startsWith('`') && part.endsWith('`') ? (
                      <code key={i} className="bg-destructive/20 px-1.5 py-1 rounded-sm text-white">
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          // Fallback for non-checklist multi-line errors
          <pre className="text-xs whitespace-pre-wrap font-sans mt-2">{lines.join('\n')}</pre>
        )}
      </AlertDescription>
    </Alert>
  );
}
