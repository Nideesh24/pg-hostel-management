import { NextResponse } from 'next/server';
import { getAuthenticatedOwner } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface CreatePropertyBody {
  name: string;
  address: string;
  ownerId: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactNumber?: string;
  email?: string;
  description?: string;
  amenities?: string[];
}

export async function POST(request: Request) {
  try {
    const ownerSession = await getAuthenticatedOwner();
    if (!ownerSession) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body: CreatePropertyBody = await request.json();
    const { name, address, ownerId, city, state, postalCode, contactNumber, email, description, amenities } = body;
    if (ownerId && ownerId !== ownerSession.id) {
      return NextResponse.json({ success: false, error: 'Property owner does not match the signed-in user.' }, { status: 403 });
    }

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Property name is required.' },
        { status: 400 }
      );
    }

    if (!address?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Property address is required.' },
        { status: 400 }
      );
    }

    if (!ownerId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Owner ID (ownerId) is required.' },
        { status: 400 }
      );
    }

    // Verify that the owner user exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: `Owner with ID '${ownerId}' does not exist.` },
        { status: 404 }
      );
    }

    // Generate URL-friendly slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create the Property record
    const property = await prisma.property.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        ownerId: ownerSession.id,
        slug,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        contactNumber: contactNumber?.trim() || null,
        email: email?.trim() || null,
        description: description?.trim() || null,
        amenities: Array.isArray(amenities) ? amenities : [],
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Property created successfully.',
        data: property,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/owner/properties] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while creating property.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
