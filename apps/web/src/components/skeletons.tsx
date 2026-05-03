export function MovieCardSkeleton() {
    return (
        <div className="movie-card" style={{ pointerEvents: 'none' }}>
            <div
                className="movie-poster"
                style={{
                    background: 'linear-gradient(90deg, rgba(17,24,39,0.06) 25%, rgba(17,24,39,0.12) 50%, rgba(17,24,39,0.06) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite'
                }}
            />
            <div style={{
                height: '1rem',
                background: 'rgba(17,24,39,0.10)',
                borderRadius: '4px',
                marginTop: '0.5rem',
                width: '80%'
            }} />
        </div>
    );
}

export function RailSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div style={{ marginBottom: '3rem' }}>
            {/* Title skeleton */}
            <div style={{
                height: '2rem',
                width: '200px',
                background: 'rgba(17,24,39,0.10)',
                borderRadius: '4px',
                marginBottom: '1.5rem'
            }} />

            {/* Cards skeleton */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                overflowX: 'hidden'
            }}>
                {[...Array(count)].map((_, i) => (
                    <div key={i} style={{ minWidth: '200px' }}>
                        <MovieCardSkeleton />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HeroBannerSkeleton() {
    return (
        <div style={{
            position: 'relative',
            height: '70vh',
            minHeight: '400px',
            background: 'linear-gradient(90deg, rgba(17,24,39,0.06) 25%, rgba(17,24,39,0.12) 50%, rgba(17,24,39,0.06) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
        }}>
            <div style={{
                position: 'absolute',
                bottom: '4rem',
                left: '2rem',
                maxWidth: '600px'
            }}>
                <div style={{
                    height: '3rem',
                    width: '400px',
                    background: 'rgba(17,24,39,0.12)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }} />
                <div style={{
                    height: '1.5rem',
                    width: '500px',
                    background: 'rgba(17,24,39,0.10)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                }} />
                <div style={{
                    height: '1.5rem',
                    width: '450px',
                    background: 'rgba(17,24,39,0.10)',
                    borderRadius: '4px',
                    marginBottom: '2rem'
                }} />
                <div style={{
                    height: '3rem',
                    width: '120px',
                    background: 'rgba(17,24,39,0.12)',
                    borderRadius: '6px'
                }} />
            </div>
        </div>
    );
}

// Add shimmer animation to globals.css if not exist
