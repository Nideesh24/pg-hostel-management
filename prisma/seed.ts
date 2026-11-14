import { PrismaClient, RoomType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PRIMARY_OWNER_EMAIL = 'srinideesh2007@gmail.com';
const DEMO_TENANT_EMAILS = [
  'rahul.verma@example.com',
  'priya.das@example.com',
  'amit.kumar@example.com',
];

async function removeSeededDemoTenants() {
  const demoTenants = await prisma.tenant.findMany({
    where: { email: { in: DEMO_TENANT_EMAILS } },
    select: { id: true, bedId: true },
  });
  const tenantIds = demoTenants.map((tenant) => tenant.id);
  const demoBedIds = demoTenants.flatMap((tenant) => tenant.bedId ? [tenant.bedId] : []);

  if (tenantIds.length > 0) {
    await prisma.complaint.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rentInvoice.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  if (demoBedIds.length > 0) {
    await prisma.bed.updateMany({
      where: { id: { in: demoBedIds } },
      data: { status: 'VACANT' },
    });
  }
  await prisma.user.deleteMany({
    where: { email: { in: DEMO_TENANT_EMAILS }, role: 'TENANT' },
  });
}

async function main() {
  await removeSeededDemoTenants();

  const passwordHash = await bcrypt.hash('24012007', 10);
  const owner = await prisma.user.upsert({
    where: { email: PRIMARY_OWNER_EMAIL },
    create: {
      name: 'P. Srinideesh',
      email: PRIMARY_OWNER_EMAIL,
      phone: '9791157550',
      passwordHash,
      role: 'OWNER',
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: new Date(),
    },
    update: {
      name: 'P. Srinideesh',
      phone: '9791157550',
      passwordHash,
      role: 'OWNER',
      approvalStatus: 'APPROVED',
      isActive: true,
      sessionToken: null,
      sessionExpiresAt: null,
    },
  });

  const property = await prisma.property.upsert({
    where: { slug: 'om-murugaa-mens-hostel' },
    create: {
      name: 'OM MURUGAA MENS HOSTEL',
      slug: 'om-murugaa-mens-hostel',
      address: 'Porur, Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      contactNumber: '9791157550',
      email: 'contact@ommurugaahostel.com',
      ownerId: owner.id,
    },
    update: {
      name: 'OM MURUGAA MENS HOSTEL',
      address: 'Porur, Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      contactNumber: '9791157550',
      ownerId: owner.id,
    },
  });

  const rooms = [
    { roomNumber: '101', floor: 1, roomType: RoomType.SINGLE, sharingType: 1, baseRent: 12000, bedNumbers: ['101-A'] },
    { roomNumber: '102', floor: 1, roomType: RoomType.DOUBLE, sharingType: 2, baseRent: 8000, bedNumbers: ['102-A', '102-B'] },
    { roomNumber: '103', floor: 2, roomType: RoomType.TRIPLE, sharingType: 3, baseRent: 6500, bedNumbers: ['103-A', '103-B', '103-C'] },
  ];

  for (const roomData of rooms) {
    const { bedNumbers, ...roomFields } = roomData;
    const room = await prisma.room.upsert({
      where: { propertyId_roomNumber: { propertyId: property.id, roomNumber: roomData.roomNumber } },
      create: {
        ...roomFields,
        propertyId: property.id,
        hasAttachedBathroom: true,
        hasAC: roomData.roomNumber !== '103',
        hasBalcony: roomData.roomNumber === '102',
      },
      update: {},
    });

    for (const bedNumber of bedNumbers) {
      await prisma.bed.upsert({
        where: { roomId_bedNumber: { roomId: room.id, bedNumber } },
        create: { roomId: room.id, bedNumber, status: 'VACANT', rentAmount: roomData.baseRent },
        update: {},
      });
    }
  }

  console.log(`Seeded primary owner ${owner.email} and empty hostel rooms/beds.`);
}

main()
  .catch((error) => {
    console.error('Database seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
