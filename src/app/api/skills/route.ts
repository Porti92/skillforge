import { auth } from '@clerk/nextjs/server';
import { saveSkill, getUserSkills, getPublicSkills } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/skills - Get user's skills or public skills
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicOnly = searchParams.get('public') === 'true';
  
  if (publicOnly) {
    const skills = await getPublicSkills();
    return NextResponse.json({ skills });
  }
  
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const skills = await getUserSkills(userId);
  return NextResponse.json({ skills });
}

// POST /api/skills - Save a new skill
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { name, description, files, configValues, isPublic } = body;
    
    if (!name || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const skillId = await saveSkill(
      userId,
      name,
      description || '',
      files,
      configValues || {},
      isPublic || false
    );
    
    return NextResponse.json({ id: skillId, success: true });
  } catch (error) {
    console.error('Error saving skill:', error);
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 });
  }
}
