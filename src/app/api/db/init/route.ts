import { initDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/db/init - Initialize database tables
// This should only be called once during setup
export async function POST() {
  // In production, you might want to add some auth here
  // For now, we'll allow it to run
  
  try {
    await initDatabase();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
