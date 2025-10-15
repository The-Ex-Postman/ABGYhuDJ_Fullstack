const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { date } = require('zod');

async function main() {

    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminEmail = "dev.ABGYuhDJ@gmail.com";

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password: hashedPassword },
        create: {
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    const concertsData = [
        {
            ville: 'Paris',
            date: new Date('2025-06-01T20:30:00Z'),
            lieu: 'Accor Arena',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Lille',
            date: new Date('2025-06-05T20:30:00Z'),
            lieu: 'l\'Aéronef',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Nantes',
            date: new Date('2025-06-09T20:30:00Z'),
            lieu: 'Warehouse',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Bordeaux',
            date: new Date('2025-06-14T20:30:00Z'),
            lieu: 'L\'Arena',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Toulouse',
            date: new Date('2025-06-20T20:30:00Z'),
            lieu: 'Le Bikini',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Marseille',
            date: new Date('2025-06-25T20:30:00Z'),
            lieu: 'Le Dôme',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Lyon',
            date: new Date('2025-07-01T20:30:00Z'),
            lieu: 'Le Transbordeur',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        },
        {
            ville: 'Strasbourg',
            date: new Date('2025-06-06T20:30:00Z'),
            lieu: 'La Laiterie',
            placesDispo: 1000,
            prixDebout: 40.00,
            prixAssis: 50.00,
        }
    ];

    for (const concert of concertsData) {
        await prisma.concert.upsert({
            where: { ville_date_lieu: { ville: concert.ville, date: concert.date, lieu: concert.lieu, },
        },
        update: {},
        create: concert,
    });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

