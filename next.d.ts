// Declaration file for Next.js modules that lack type definitions
declare module 'next/server' {
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
  
  export interface NextRequest extends Request {
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string, options?: { path?: string; maxAge?: number }): void;
      delete(name: string): void;
    };
    nextUrl: URL;
  }
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    refresh(): void;
    back(): void;
    forward(): void;
  };
  
  export function useSearchParams(): URLSearchParams;
  export function usePathname(): string;
}

declare module 'next/script' {
  import { ReactNode } from 'react';
  
  export interface ScriptProps {
    src?: string;
    strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
    onLoad?: () => void;
    onError?: () => void;
    children?: ReactNode;
  }
  
  export default function Script(props: ScriptProps): JSX.Element;
}
