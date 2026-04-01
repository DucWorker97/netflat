'use client';

// DEBUG-ONLY COMPONENT
// Remove this file (and its mount line in app/layout.tsx) when requested to strip debugging code.

import { useEffect, useMemo, useState } from 'react';

type RecorderEvent = {
    ts: string;
    type: string;
    data: Record<string, unknown>;
};

type ExportRecorder = () => void;

declare global {
    interface Window {
        __netflatRecorderExport?: ExportRecorder;
    }
}

function cssSelector(element: EventTarget | null): string {
    if (!(element instanceof Element)) {
        return 'unknown';
    }

    const id = element.getAttribute('id');
    if (id) {
        return `#${id}`;
    }

    const classes = (element.getAttribute('class') || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => `.${item}`)
        .join('');

    return `${element.tagName.toLowerCase()}${classes}`;
}

function normalizeValue(target: EventTarget | null): string {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return '';
    }

    if (target instanceof HTMLInputElement && target.type === 'password') {
        return '[masked]';
    }

    return String(target.value).slice(0, 200);
}

function downloadJsonFile(filename: string, payload: unknown): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function buildFilename(appName: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${appName}-session-${stamp}.json`;
}

export function DebugSessionRecorder({ appName }: { appName: 'web' | 'admin' }) {
    const [enabled, setEnabled] = useState(true);
    const [eventCount, setEventCount] = useState(0);
    const badgeLabel = useMemo(() => (enabled ? `REC ${eventCount}` : 'REC OFF'), [enabled, eventCount]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const flag = params.get('record');
        if (flag === '0') {
            setEnabled(false);
            return;
        }

        setEnabled(true);
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const events: RecorderEvent[] = [];
        const startedAt = new Date().toISOString();

        const pushEvent = (type: string, data: Record<string, unknown>) => {
            events.push({ ts: new Date().toISOString(), type, data });
            setEventCount(events.length);
        };

        const originalFetch = window.fetch.bind(window);
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);

        const onClick = (event: MouseEvent) => {
            pushEvent('click', {
                selector: cssSelector(event.target),
                x: event.clientX,
                y: event.clientY,
            });
        };

        const onInput = (event: Event) => {
            pushEvent('input', {
                selector: cssSelector(event.target),
                value: normalizeValue(event.target),
            });
        };

        const onChange = (event: Event) => {
            pushEvent('change', {
                selector: cssSelector(event.target),
                value: normalizeValue(event.target),
            });
        };

        const onJsError = (event: ErrorEvent) => {
            pushEvent('error', {
                message: event.message,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
            });
        };

        const onUnhandled = (event: PromiseRejectionEvent) => {
            const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
            pushEvent('unhandledrejection', { reason });
        };

        const onPopState = () => {
            pushEvent('navigation', {
                kind: 'popstate',
                href: window.location.href,
            });
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                window.__netflatRecorderExport?.();
            }
        };

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const started = performance.now();
            const requestUrl = typeof input === 'string'
                ? input
                : input instanceof URL
                ? input.toString()
                : input.url;
            const method = init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET');

            try {
                const response = await originalFetch(input, init);
                pushEvent('fetch', {
                    url: requestUrl,
                    method,
                    status: response.status,
                    durationMs: Math.round(performance.now() - started),
                });
                return response;
            } catch (error: unknown) {
                pushEvent('fetch_error', {
                    url: requestUrl,
                    method,
                    durationMs: Math.round(performance.now() - started),
                    message: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        };

        window.history.pushState = function pushState(...args: Parameters<History['pushState']>) {
            originalPushState(...args);
            pushEvent('navigation', {
                kind: 'pushState',
                href: window.location.href,
            });
        };

        window.history.replaceState = function replaceState(...args: Parameters<History['replaceState']>) {
            originalReplaceState(...args);
            pushEvent('navigation', {
                kind: 'replaceState',
                href: window.location.href,
            });
        };

        const exportNow = () => {
            const report = {
                app: appName,
                startedAt,
                exportedAt: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                eventCount: events.length,
                events,
            };
            downloadJsonFile(buildFilename(appName), report);
        };

        const stop = () => {
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('input', onInput, true);
            document.removeEventListener('change', onChange, true);
            window.removeEventListener('error', onJsError);
            window.removeEventListener('unhandledrejection', onUnhandled);
            window.removeEventListener('popstate', onPopState);
            window.removeEventListener('keydown', onKeyDown);

            window.fetch = originalFetch;
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };

        window.__netflatRecorderExport = exportNow;

        pushEvent('session_start', {
            href: window.location.href,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
        });

        document.addEventListener('click', onClick, true);
        document.addEventListener('input', onInput, true);
        document.addEventListener('change', onChange, true);
        window.addEventListener('error', onJsError);
        window.addEventListener('unhandledrejection', onUnhandled);
        window.addEventListener('popstate', onPopState);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            stop();
            delete window.__netflatRecorderExport;
        };
    }, [enabled, appName]);

    if (!enabled) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => window.__netflatRecorderExport?.()}
            title="Download current session JSON (shortcut: Ctrl+Shift+S)"
            style={{
                position: 'fixed',
                right: 12,
                bottom: 12,
                zIndex: 2147483647,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(220,38,38,0.45)',
                background: 'rgba(153,27,27,0.95)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
        >
            {badgeLabel}
        </button>
    );
}
