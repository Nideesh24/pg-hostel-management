import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ComplaintCategory } from '@prisma/client';

interface CreateComplaintBody {
  tenantId: string;
  title: string;
  category: string;
  description: string;
  photoUrl?: string;
}

const ALLOWED_CATEGORIES: Record<string, ComplaintCategory> = {
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  WIFI: 'WIFI',
  WIFI_INTERNET: 'WIFI',
  CLEANING: 'CLEANING',
  CLEANING_HOUSEKEEPING: 'CLEANING',
  FOOD: 'FOOD',
  FOOD_MESS: 'FOOD',
  OTHER: 'OTHER',
};

// --------------------------------------------------------
// 1. POST /api/tenant/complaints: Register a new complaint
// --------------------------------------------------------
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedTenant();
    if (!user?.tenantProfile) {
      return NextResponse.json({ success: false, error: 'Approved tenant sign-in is required.' }, { status: 403 });
    }

    const body: CreateComplaintBody = await request.json();
    const { tenantId, title, category, description, photoUrl } = body;

    // Field validations
    if (!tenantId?.trim()) {
      return NextResponse.json(
        { success: false, error: "Field 'tenantId' is required." },
        { status: 400 }
      );
    }
    if (tenantId.trim() !== user.tenantProfile.id) {
      return NextResponse.json({ success: false, error: 'You may only create complaints for your own account.' }, { status: 403 });
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Complaint 'title' is required." },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint 'category' is required. Allowed: PLUMBING, ELECTRICAL, WIFI, CLEANING, FOOD, OTHER.",
        },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Complaint 'description' is required." },
        { status: 400 }
      );
    }

    const normalizedCategoryKey = category.trim().toUpperCase();
    const resolvedCategory = ALLOWED_CATEGORIES[normalizedCategoryKey];

    if (!resolvedCategory) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category '${category}'. Allowed categories are: PLUMBING, ELECTRICAL, WIFI, CLEANING, FOOD, OTHER.`,
        },
        { status: 400 }
      );
    }

    // Verify tenant exists and fetch propertyId
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId.trim() },
      select: {
        id: true,
        name: true,
        propertyId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant with ID '${tenantId}' was not found.` },
        { status: 404 }
      );
    }

    // Generate unique ticket number: e.g. TCK-202611-A8X2
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketNumber = `TCK-${yearMonth}-${randomSuffix}`;

    const sanitizedPhotoUrl = photoUrl?.trim() || null;

    // Create complaint record
    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber,
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        title: title.trim(),
        category: resolvedCategory,
        description: description.trim(),
        photoUrl: sanitizedPhotoUrl,
        attachmentUrls: sanitizedPhotoUrl ? [sanitizedPhotoUrl] : [],
        status: 'OPEN',
        priority: 'MEDIUM',
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Complaint ticket ${ticketNumber} raised successfully.`,
        data: complaint,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/tenant/complaints] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while creating complaint ticket.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------------------
// 2. GET /api/tenant/complaints: Fetch all tenant complaints
// --------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedTenant();
    if (!user?.tenantProfile) {
      return NextResponse.json({ success: false, error: 'Approved tenant sign-in is required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter 'tenantId' is required. Example: /api/tenant/complaints?tenantId=clx...",
        },
        { status: 400 }
      );
    }
    if (tenantId.trim() !== user.tenantProfile.id) {
      return NextResponse.json({ success: false, error: 'You may only view your own complaints.' }, { status: 403 });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId.trim() },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant with ID '${tenantId}' was not found.` },
        { status: 404 }
      );
    }

    // Fetch complaints logged by this tenant sorted by createdAt descending
    const complaints = await prisma.complaint.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        count: complaints.length,
        complaints: complaints.map((c) => ({
          id: c.id,
          ticketNumber: c.ticketNumber,
          title: c.title,
          category: c.category,
          description: c.description,
          photoUrl: c.photoUrl,
          attachmentUrls: c.attachmentUrls,
          status: c.status,
          priority: c.priority,
          assignedTo: c.assignedTo,
          resolutionNotes: c.resolutionNotes,
          resolvedAt: c.resolvedAt,
          property: c.property,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/tenant/complaints] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching tenant complaints.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
