import { auth } from '@clerk/nextjs/server';
import { getSkill, updateSkill, deleteSkill } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/skills/[id] - Get a single skill
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  const skill = await getSkill(params.id, userId || undefined);
  
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }
  
  return NextResponse.json({ skill });
}

// PATCH /api/skills/[id] - Update a skill
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const success = await updateSkill(params.id, userId, body);
    
    if (!success) {
      return NextResponse.json({ error: 'Skill not found or not authorized' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }
}

// DELETE /api/skills/[id] - Delete a skill
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const success = await deleteSkill(params.id, userId);
  
  if (!success) {
    return NextResponse.json({ error: 'Skill not found or not authorized' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}
