/**
 * The Studio renders its own <html>/<body> chrome expectations, so this route
 * group deliberately bypasses the storefront layout's fonts and tokens.
 */

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
