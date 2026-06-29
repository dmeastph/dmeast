import { Component } from "react";
import * as Sentry from "@sentry/react";
import { ds } from "../constants/design";
import { Btn } from "./ui";

/**
 * React error boundary — catches render errors in lazy-loaded chunks
 * and ships them to Sentry (if DSN is configured) before showing a
 * graceful fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // Ship to Sentry with React component stack as context
    const eventId = Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
    this.setState({ eventId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          paddingTop: 91, minHeight: "80vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "80px 28px",
        }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: ds.font.display, fontSize: 22,
              color: ds.color.textDark, marginBottom: 10,
            }}>
              Something went wrong
            </div>
            <p style={{
              fontSize: 14, color: ds.color.textMuted,
              lineHeight: 1.6, marginBottom: 24,
            }}>
              This page encountered an unexpected error. Try refreshing — if the
              problem persists, contact us at{" "}
              <a href="mailto:info@dmeastph.com" style={{ color: ds.color.red }}>
                info@dmeastph.com
              </a>.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{
                background: ds.color.canvas, border: `1px solid ${ds.color.border}`,
                borderRadius: ds.radius.md, padding: "12px 16px",
                fontSize: 11, textAlign: "left", overflowX: "auto",
                color: ds.color.red, marginBottom: 20, maxHeight: 200,
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn variant="primary" size="md" onClick={() => window.location.reload()}>
                Reload Page
              </Btn>
              <Btn variant="outline" size="md" onClick={() => { window.location.href = "/"; }}>
                Back to Home
              </Btn>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
