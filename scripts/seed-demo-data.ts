import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { encodeBase64url } from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { readFileSync } from 'fs';
import { webcrypto } from 'crypto';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
	envContent.split('\n').filter(line => line.includes('=')).map(line => {
		const [key, ...values] = line.split('=');
		return [key.trim(), values.join('=').trim()];
	})
);

const client = createClient({ url: envVars.DATABASE_URL });
const db = drizzle(client, { schema });

function generateId(): string {
	const bytes = new Uint8Array(15);
	webcrypto.getRandomValues(bytes);
	return encodeBase64url(bytes);
}

// PBKDF2 password hashing (compatible with Cloudflare Workers)
// Note: Cloudflare Workers limit is 100000 iterations
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

async function hashPassword(password: string): Promise<string> {
	const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);
	
	const keyMaterial = await webcrypto.subtle.importKey(
		'raw',
		passwordData,
		'PBKDF2',
		false,
		['deriveBits']
	);
	
	const derivedBits = await webcrypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		keyMaterial,
		KEY_LENGTH * 8
	);
	
	const hashArray = new Uint8Array(derivedBits);
	const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
	const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
	
	return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomMultiple<T>(arr: T[], min: number, max: number): T[] {
	const count = randomInt(min, max);
	const shuffled = [...arr].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

async function seedDemoData() {
	console.log('🌱 Seeding demo data...\n');

	// 1. Create Categories
	console.log('📁 Creating categories...');
	const categories = [
		{ id: generateId(), name: 'Aliança PRO', color: '#6366f1' },
		{ id: generateId(), name: 'Aliança', color: '#22c55e' },
		{ id: generateId(), name: 'Mastermind Aliança', color: '#f59e0b' },
		{ id: generateId(), name: 'Hot Seat', color: '#ef4444' }
	];

	for (const cat of categories) {
		await db.insert(schema.category).values({
			id: cat.id,
			name: cat.name,
			color: cat.color,
			isActive: true
		});
		console.log(`   ✅ Category: ${cat.name}`);
	}

	// 2. Create Products
	console.log('\n📦 Creating products...');
	const products = [
		{ id: generateId(), name: 'Aliança Pro Mensal' },
		{ id: generateId(), name: 'Aliança Pro Anual' },
		{ id: generateId(), name: 'Mastermind' },
		{ id: generateId(), name: 'Mentoria Individual' },
		{ id: generateId(), name: 'Consultoria Empresarial' }
	];

	for (const prod of products) {
		await db.insert(schema.product).values({
			id: prod.id,
			name: prod.name,
			isActive: true
		});
		console.log(`   ✅ Product: ${prod.name}`);
	}

	// 3. Create Demo Users
	console.log('\n👥 Creating demo users...');
	const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Fernando', 'Beatriz', 'Lucas', 'Camila', 'Rafael', 'Larissa', 'Bruno', 'Patricia', 'Thiago', 'Amanda', 'Gustavo', 'Fernanda', 'Ricardo', 'Vanessa', 'Diego', 'Isabela', 'Marcelo', 'Carolina', 'Eduardo', 'Renata', 'Felipe', 'Gabriela', 'André', 'Leticia'];
	const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Pereira', 'Costa', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro', 'Lima', 'Monteiro', 'Cardoso', 'Nascimento'];
	const companies = ['Tech Solutions', 'Digital Marketing Pro', 'Consultoria ABC', 'Startup XYZ', 'Empresa Global', 'Serviços Premium', 'Agência Criativa', 'Indústria Nacional', 'Comércio Express', 'Investimentos SA', 'Educação Plus', 'Saúde Total', 'Imobiliária Central', 'Advocacia Legal', 'Contabilidade Prática'];

	const users: { id: string; name: string }[] = [];
	const passwordHash = await hashPassword('Demo123#');

	for (let i = 0; i < 50; i++) {
		const firstName = pickRandom(firstNames);
		const lastName = pickRandom(lastNames);
		const fullName = `${firstName} ${lastName}`;
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
		const company = pickRandom(companies);
		const product = pickRandom(products);
		const phone = `119${randomInt(10000000, 99999999)}`;

		const userId = generateId();
		users.push({ id: userId, name: fullName });

		await db.insert(schema.user).values({
			id: userId,
			email,
			phone,
			username: fullName,
			companyName: company,
			productId: product.id,
			passwordHash,
			role: 'user'
		});
	}
	console.log(`   ✅ Created ${users.length} demo users`);

	// 4. Get admin user for event creation
	const [adminUser] = await db.select().from(schema.user).where(eq(schema.user.role, 'admin')).limit(1);
	const creatorId = adminUser?.id || users[0].id;

	// 5. Create Events (last 6 months)
	console.log('\n📅 Creating events...');
	const eventTemplates = [
		{ name: 'Encontro Aliança PRO', category: 'Aliança PRO', description: 'Encontro exclusivo para membros PRO com conteúdo avançado.' },
		{ name: 'Reunião Semanal Aliança', category: 'Aliança', description: 'Reunião semanal com toda a comunidade Aliança.' },
		{ name: 'Mastermind Mensal', category: 'Mastermind Aliança', description: 'Sessão de mastermind com grupo seleto de empresários.' },
		{ name: 'Hot Seat Semanal', category: 'Hot Seat', description: 'Sessão de hot seat para resolução de problemas específicos.' },
		{ name: 'Workshop Aliança PRO', category: 'Aliança PRO', description: 'Workshop prático com ferramentas e estratégias avançadas.' },
		{ name: 'Networking Aliança', category: 'Aliança', description: 'Evento de networking entre membros da comunidade.' },
		{ name: 'Imersão Mastermind', category: 'Mastermind Aliança', description: 'Imersão intensiva de um dia inteiro.' },
		{ name: 'Hot Seat Especial', category: 'Hot Seat', description: 'Hot seat com convidado especial do mercado.' },
		{ name: 'Live Aliança PRO', category: 'Aliança PRO', description: 'Transmissão ao vivo exclusiva para membros PRO.' },
		{ name: 'Q&A Aliança', category: 'Aliança', description: 'Sessão de perguntas e respostas ao vivo.' }
	];

	const events: { id: string; expectedAttendees: number }[] = [];
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
	const today = new Date();

	// Create ~40 events over the last 6 months
	for (let i = 0; i < 40; i++) {
		const template = pickRandom(eventTemplates);
		const eventDate = randomDate(sixMonthsAgo, today);
		const startHour = randomInt(9, 18);
		const durationHours = randomInt(1, 3);

		eventDate.setHours(startHour, 0, 0, 0);
		const endTime = new Date(eventDate);
		endTime.setHours(startHour + durationHours);

		const eventId = generateId();
		const slug = `${template.name.toLowerCase().replace(/\s+/g, '-')}-${eventId.slice(0, 6)}`;
		const expectedAttendees = randomInt(15, 50);

		events.push({ id: eventId, expectedAttendees });

		await db.insert(schema.event).values({
			id: eventId,
			slug,
			name: `${template.name} #${i + 1}`,
			description: template.description,
			dateTime: eventDate,
			endTime,
			meetLink: `https://meet.google.com/abc-defg-${randomInt(100, 999)}`,
			expectedAttendees,
			createdBy: creatorId,
			isActive: true
		});

		// Link event to category
		const category = categories.find(c => c.name === template.category);
		if (category) {
			await db.insert(schema.eventCategory).values({
				eventId,
				categoryId: category.id
			});
		}

		// Sometimes add a second category
		if (Math.random() > 0.7) {
			const extraCategory = pickRandom(categories.filter(c => c.name !== template.category));
			await db.insert(schema.eventCategory).values({
				eventId,
				categoryId: extraCategory.id
			}).catch(() => {}); // Ignore duplicate key errors
		}
	}
	console.log(`   ✅ Created ${events.length} events`);

	// 6. Create Attendances
	console.log('\n✋ Creating attendances...');
	let attendanceCount = 0;

	for (const event of events) {
		// Random attendance rate between 40% and 95%
		const attendanceRate = randomInt(40, 95) / 100;
		const attendeesCount = Math.floor(event.expectedAttendees * attendanceRate);
		const attendees = pickRandomMultiple(users, attendeesCount, attendeesCount);

		for (const user of attendees) {
			await db.insert(schema.attendance).values({
				id: generateId(),
				eventId: event.id,
				userId: user.id,
				attended: Math.random() > 0.1 // 90% actually attended
			});
			attendanceCount++;
		}
	}
	console.log(`   ✅ Created ${attendanceCount} attendance records`);

	console.log('\n🎉 Demo data seeding complete!');
	console.log('\n📊 Summary:');
	console.log(`   • ${categories.length} categories`);
	console.log(`   • ${products.length} products`);
	console.log(`   • ${users.length} users`);
	console.log(`   • ${events.length} events`);
	console.log(`   • ${attendanceCount} attendances`);
}

seedDemoData().catch(console.error);
