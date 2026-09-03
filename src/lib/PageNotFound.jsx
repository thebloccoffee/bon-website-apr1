import { useEffect } from 'react';

export default function PageNotFound() {
    // The SPA rewrite makes every unknown path return HTTP 200, so without this
    // Google would happily index an unlimited number of soft-404s.
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="font-sans text-7xl font-light text-accent">404</h1>
                        <div className="h-px w-16 bg-border mx-auto"></div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="font-sans text-2xl font-light text-foreground">
                            Lost in transit
                        </h2>
                        <p className="font-serif text-muted-foreground leading-relaxed">
                            The path you're seeking doesn't exist on this map.
                        </p>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="font-sans text-xs tracking-[0.3em] uppercase text-foreground border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-500"
                        >
                            Return home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}