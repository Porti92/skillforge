import { neon } from '@neondatabase/serverless';

// Lazy initialization to avoid build errors when DATABASE_URL isn't set
let sqlClient: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

// Types
export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description: string;
  files: SkillFile[];
  config_values: Record<string, string>;
  created_at: Date;
  updated_at: Date;
  is_public: boolean;
}

export interface SkillFile {
  path: string;
  content: string;
}

// Initialize database tables
export async function initDatabase() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      files JSONB NOT NULL DEFAULT '[]',
      config_values JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_public BOOLEAN DEFAULT false
    )
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id)
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skills_is_public ON skills(is_public)
  `;
}

// Save a skill
export async function saveSkill(
  userId: string,
  name: string,
  description: string,
  files: SkillFile[],
  configValues: Record<string, string> = {},
  isPublic: boolean = false
): Promise<string> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO skills (user_id, name, description, files, config_values, is_public)
    VALUES (${userId}, ${name}, ${description}, ${JSON.stringify(files)}, ${JSON.stringify(configValues)}, ${isPublic})
    RETURNING id
  `;
  return result[0].id;
}

// Get skills for a user
export async function getUserSkills(userId: string): Promise<Skill[]> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM skills 
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return result as Skill[];
}

// Get a single skill
export async function getSkill(skillId: string, userId?: string): Promise<Skill | null> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM skills 
    WHERE id = ${skillId}
    AND (is_public = true OR user_id = ${userId || ''})
  `;
  return result[0] as Skill || null;
}

// Get public skills
export async function getPublicSkills(limit: number = 50): Promise<Skill[]> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM skills 
    WHERE is_public = true
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result as Skill[];
}

// Delete a skill
export async function deleteSkill(skillId: string, userId: string): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    DELETE FROM skills 
    WHERE id = ${skillId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.length > 0;
}

// Update a skill
export async function updateSkill(
  skillId: string,
  userId: string,
  updates: Partial<Pick<Skill, 'name' | 'description' | 'files' | 'config_values' | 'is_public'>>
): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE skills 
    SET name = COALESCE(${updates.name ?? null}, name),
        description = COALESCE(${updates.description ?? null}, description),
        files = COALESCE(${updates.files ? JSON.stringify(updates.files) : null}, files),
        config_values = COALESCE(${updates.config_values ? JSON.stringify(updates.config_values) : null}, config_values),
        is_public = COALESCE(${updates.is_public ?? null}, is_public),
        updated_at = NOW()
    WHERE id = ${skillId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.length > 0;
}
