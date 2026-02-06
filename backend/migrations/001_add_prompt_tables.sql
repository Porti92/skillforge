-- Migration: Add prompt management tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- BASE PROMPTS TABLE
-- Stores core system prompts (spec-generation, question-generation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS base_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  contract_version INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by slug
CREATE INDEX IF NOT EXISTS idx_base_prompts_slug ON base_prompts(slug) WHERE is_active = true;

-- ============================================================================
-- AGENT PROMPTS TABLE
-- Stores agent-specific instructions (v0, bolt, lovable, claude-code, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  output_format_hints TEXT,
  focus_areas JSONB,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, version)
);

-- Index for fast lookups by agent_id
CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_id ON agent_prompts(agent_id) WHERE is_active = true;

-- ============================================================================
-- SPEC MODE PROMPTS TABLE
-- Stores spec mode instructions (mvp, production-ready)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spec_mode_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  emphasis_points JSONB,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mode, version)
);

-- Index for fast lookups by mode
CREATE INDEX IF NOT EXISTS idx_spec_mode_prompts_mode ON spec_mode_prompts(mode) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Prompts are read-only for all users, write via service role only
-- ============================================================================

-- Enable RLS on all prompt tables
ALTER TABLE base_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_mode_prompts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active base prompts
CREATE POLICY "Anyone can read active base prompts" ON base_prompts
  FOR SELECT USING (is_active = true);

-- Anyone can read active agent prompts
CREATE POLICY "Anyone can read active agent prompts" ON agent_prompts
  FOR SELECT USING (is_active = true);

-- Anyone can read active spec mode prompts
CREATE POLICY "Anyone can read active spec mode prompts" ON spec_mode_prompts
  FOR SELECT USING (is_active = true);

-- Note: Write access requires service_role key (bypasses RLS)
-- This is intentional - prompts should only be modified through migrations
-- or admin tooling, not through the API

-- ============================================================================
-- UPDATED_AT TRIGGER
-- Automatically update the updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all prompt tables
DROP TRIGGER IF EXISTS update_base_prompts_updated_at ON base_prompts;
CREATE TRIGGER update_base_prompts_updated_at
  BEFORE UPDATE ON base_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_prompts_updated_at ON agent_prompts;
CREATE TRIGGER update_agent_prompts_updated_at
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_spec_mode_prompts_updated_at ON spec_mode_prompts;
CREATE TRIGGER update_spec_mode_prompts_updated_at
  BEFORE UPDATE ON spec_mode_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
