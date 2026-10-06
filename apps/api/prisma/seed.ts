import bcrypt from "bcryptjs";
import { PostType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const img = (seed: string, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AUDIO = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const artists = [
  { handle: "aarav_strings", name: "Aarav Sen", category: "Musician", city: "Kolkata", price: 15000, bio: "Sitar and fusion. Weddings, lounges and intimate concerts.", langs: ["Bengali", "Hindi", "English"], verified: true },
  { handle: "meera_moves", name: "Meera Iyer", category: "Dancer", city: "Bengaluru", price: 12000, bio: "Bharatanatyam meets contemporary. Choreography for events and films.", langs: ["Tamil", "English"], verified: true },
  { handle: "dj_nilotpal", name: "DJ Nilotpal", category: "DJ", city: "Kolkata", price: 25000, bio: "House, Bollywood remixes and club nights. 8 years behind the decks.", langs: ["Hindi", "Bengali"], verified: false },
  { handle: "riya_sketches", name: "Riya Das", category: "Painter", city: "Delhi", price: 8000, bio: "Live portrait painting for weddings and corporate events.", langs: ["Hindi", "English"], verified: false },
  { handle: "kabir_comedy", name: "Kabir Malhotra", category: "Comedian", city: "Mumbai", price: 30000, bio: "Stand-up for corporate shows and private parties. Clean sets available.", langs: ["Hindi", "English"], verified: true },
  { handle: "sanaya_vocals", name: "Sanaya Kapoor", category: "Singer", city: "Mumbai", price: 20000, bio: "Soulful ghazals and acoustic covers with a live band option.", langs: ["Hindi", "Urdu", "English"], verified: true },
];

async function main() {
  await prisma.booking.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.package.deleteMany();
  await prisma.artistProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: { email: "fan@example.com", name: "Demo Fan", passwordHash, role: "USER" },
  });

  for (const [i, a] of artists.entries()) {
    const user = await prisma.user.create({
      data: {
        email: `${a.handle}@example.com`,
        name: a.name,
        passwordHash,
        role: "ARTIST",
        avatarUrl: img(`${a.handle}-avatar`, 300, 300),
        artistProfile: {
          create: {
            handle: a.handle,
            stageName: a.name,
            bio: a.bio,
            category: a.category,
            city: a.city,
            languages: a.langs,
            priceFrom: a.price,
            verified: a.verified,
            coverUrl: img(`${a.handle}-cover`, 1600, 700),
            packages: {
              create: [
                { title: "Short set", description: "A 45 minute performance, ideal for small gatherings.", price: a.price, durationMin: 45 },
                { title: "Full evening", description: "2 hours with sound check and a custom set list.", price: Math.round(a.price * 1.8), durationMin: 120 },
                { title: "Premium experience", description: "Full evening plus meet and greet and a signed keepsake.", price: Math.round(a.price * 2.6), durationMin: 180 },
              ],
            },
          },
        },
      },
      include: { artistProfile: true },
    });

    const artistId = user.artistProfile!.id;
    const types: PostType[] = ["PHOTO", "REEL", "AUDIO", "PHOTO", "VIDEO", "PHOTO"];
    for (const [j, type] of types.entries()) {
      const seed = `${a.handle}-${j}`;
      await prisma.post.create({
        data: {
          artistId,
          type,
          caption: `${a.category} moment #${j + 1} · ${a.city}`,
          mediaUrl: type === "PHOTO" ? img(seed) : type === "AUDIO" ? AUDIO(((i + j) % 8) + 1) : VIDEO,
          thumbnailUrl: type === "PHOTO" ? null : img(seed, type === "REEL" ? 540 : 800, type === "REEL" ? 960 : 600),
          durationSec: type === "AUDIO" ? 180 + j * 20 : type === "PHOTO" ? null : 12,
          createdAt: new Date(Date.now() - (i * 6 + j) * 3600 * 1000),
        },
      });
    }
  }

  console.log("Seeded. Log in with fan@example.com or aarav_strings@example.com / password123");
}

main().finally(() => prisma.$disconnect());
