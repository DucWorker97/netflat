const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('đŸŒ± Seeding database...');

    // 1. Create genres
    const genres = [
        { name: 'Action', slug: 'action' },
        { name: 'Comedy', slug: 'comedy' },
        { name: 'Drama', slug: 'drama' },
        { name: 'Sci-Fi', slug: 'sci-fi' },
        { name: 'Horror', slug: 'horror' },
        { name: 'Romance', slug: 'romance' },
        { name: 'Thriller', slug: 'thriller' },
        { name: 'Documentary', slug: 'documentary' },
    ];

    for (const genre of genres) {
        await prisma.genre.upsert({
            where: { slug: genre.slug },
            update: {},
            create: genre,
        });
    }
    console.log(`âœ… Created ${genres.length} genres`);

    // 2. Create users
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@netflat.local' },
        update: {},
        create: {
            email: 'admin@netflat.local',
            passwordHash: adminPassword,
            role: 'admin', // UserRole.admin enum value is usually string or mapped
        },
    });

    const viewerPassword = await bcrypt.hash('viewer123', 10);
    await prisma.user.upsert({
        where: { email: 'viewer@netflat.local' },
        update: {},
        create: {
            email: 'viewer@netflat.local',
            passwordHash: viewerPassword,
            role: 'viewer',
        },
    });
    console.log('âœ… Created users');

    // 3. Create actors
    const actorsList = [
        { name: 'John Doe', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
        { name: 'Jane Smith', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
        { name: 'Robert Downey Jr.', avatarUrl: 'https://image.tmdb.org/t/p/w200/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
        { name: 'Scarlett Johansson', avatarUrl: 'https://image.tmdb.org/t/p/w200/6NsMbJXRlDGCipx49NQLDo1VIBq.jpg' },
        { name: 'Chris Evans', avatarUrl: 'https://image.tmdb.org/t/p/w200/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
        { name: 'Chris Hemsworth', avatarUrl: 'https://image.tmdb.org/t/p/w200/jpurJ9jAcLCYjgHHfYF32m3zJYm.jpg' },
        { name: 'Zendaya', avatarUrl: 'https://image.tmdb.org/t/p/w200/cbCibU53C2X4B57WjYp1h4B5ZtF.jpg' },
        { name: 'Tom Holland', avatarUrl: 'https://image.tmdb.org/t/p/w200/2qhIDp44cAqP2clOgt2afQI07X8.jpg' },
        { name: 'TimothĂ©e Chalamet', avatarUrl: 'https://image.tmdb.org/t/p/w200/BE2sdjpgEHrPSjUI8gqPGk31W5.jpg' },
        { name: 'Rebecca Ferguson', avatarUrl: 'https://image.tmdb.org/t/p/w200/lJloTOheuQSirSLXNA3JHsrMNfH.jpg' },
    ];

    const dbActors = [];
    for (const actorData of actorsList) {
        let actor = await prisma.actor.findFirst({ where: { name: actorData.name } });
        if (!actor) {
            actor = await prisma.actor.create({ data: actorData });
        }
        dbActors.push(actor);
    }
    console.log(`âœ… Seeded ${dbActors.length} actors`);

    // Helper
    const findActor = (name) => dbActors.find(a => a.name === name);
    const getGenreId = async (slug) => {
        const g = await prisma.genre.findUnique({ where: { slug } });
        return g ? g.id : null;
    };

    // 4. Create movies
    const moviesData = [
        {
            title: 'Cyber Strike',
            description: 'In a dystopian future, a group of hackers must infiltrate a powerful AI system to save humanity from digital enslavement.',
            releaseYear: 2024,
            durationSeconds: 7200,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['action', 'sci-fi'],
            cast: [
                { actor: 'John Doe', role: 'Neo' },
                { actor: 'Jane Smith', role: 'Trinity' }
            ]
        },
        {
            title: 'The Last Sunset',
            description: 'A touching drama about a retired astronaut reconnecting with his estranged daughter during his final days on Earth.',
            releaseYear: 2023,
            durationSeconds: 6900,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['drama'],
            cast: [
                { actor: 'Robert Downey Jr.', role: 'John Astronaut' },
                { actor: 'Zendaya', role: 'Daughter' }
            ]
        },
        {
            title: 'Galactic Odyssey',
            description: 'Join Captain Nova and her crew on an epic journey across the galaxy to find a new home for humanity.',
            releaseYear: 2024,
            durationSeconds: 8400,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['sci-fi', 'action'],
            cast: [
                { actor: 'Chris Evans', role: 'Captain Nova' },
                { actor: 'Chris Hemsworth', role: 'Lt. Thor' }
            ]
        },
        {
            title: 'Office Chaos',
            description: 'When a bumbling intern accidentally becomes CEO for a day, hilarity ensues.',
            releaseYear: 2023,
            durationSeconds: 5400,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['comedy'],
            cast: [
                { actor: 'Tom Holland', role: 'Intern Tom' },
                { actor: 'Scarlett Johansson', role: 'Boss Lady' }
            ]
        },
        {
            title: 'Avengers: Secret Wars',
            description: 'The ultimate showdown between the multiverse versions of Earths mightiest heroes.',
            releaseYear: 2025,
            durationSeconds: 9000,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['action', 'sci-fi', 'thriller'],
            cast: [
                { actor: 'Robert Downey Jr.', role: 'Iron Man' },
                { actor: 'Chris Evans', role: 'Captain America' },
                { actor: 'Chris Hemsworth', role: 'Thor' }
            ]
        },
        {
            title: 'Dune: Part Three',
            description: 'Paul Atreides continues his journey as the Messiah.',
            releaseYear: 2026,
            durationSeconds: 9600,
            movieStatus: 'published',
            encodeStatus: 'ready',
            genres: ['sci-fi', 'action'],
            cast: [
                { actor: 'TimothĂ©e Chalamet', role: 'Paul Atreides' },
                { actor: 'Rebecca Ferguson', role: 'Lady Jessica' },
                { actor: 'Zendaya', role: 'Chani' }
            ]
        }
    ];

    for (const m of moviesData) {
        let movie = await prisma.movie.findFirst({ where: { title: m.title } });
        if (!movie) {
            movie = await prisma.movie.create({
                data: {
                    title: m.title,
                    description: m.description,
                    releaseYear: m.releaseYear,
                    durationSeconds: m.durationSeconds,
                    movieStatus: m.movieStatus,
                    encodeStatus: m.encodeStatus,
                }
            });
            console.log(`âœ… Created movie: ${m.title}`);
        } else {
            console.log(`  Skipping existing movie: ${m.title}`);
        }

        // Genres
        for (const slug of m.genres) {
            const genreId = await getGenreId(slug);
            if (genreId) {
                try {
                    await prisma.movieGenre.create({
                        data: { movieId: movie.id, genreId }
                    });
                } catch (e) {
                    // Ignore
                }
            }
        }

        // Cast
        for (const c of m.cast) {
            const actorObj = findActor(c.actor);
            if (actorObj) {
                try {
                    await prisma.movieActor.create({
                        data: {
                            movieId: movie.id,
                            actorId: actorObj.id,
                            role: c.role
                        }
                    });
                } catch (e) {
                    // Ignore duplicates
                }
            }
        }
    }

    console.log('đŸ‰ Seeding completed!');
}

main()
    .catch((e) => {
        console.error('âŒ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });