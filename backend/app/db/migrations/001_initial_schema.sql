-- ==============================================================================
-- CortexLab / SciLab Agents — Initial Production Database Schema
-- Target: Supabase (PostgreSQL 15+ with pgvector extension)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Systematic Review Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id VARCHAR(64) UNIQUE NOT NULL,
    topic TEXT NOT NULL,
    pico_framework JSONB DEFAULT '{}'::jsonb,
    boolean_queries JSONB DEFAULT '[]'::jsonb,
    inclusion_criteria JSONB DEFAULT '[]'::jsonb,
    exclusion_criteria JSONB DEFAULT '[]'::jsonb,
    current_step VARCHAR(64) DEFAULT 'MINING',
    status VARCHAR(32) DEFAULT 'ACTIVE', -- 'ACTIVE' | 'AWAITING_HUMAN' | 'COMPLETED' | 'ARCHIVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mined & Screened Academic Papers Table
CREATE TABLE IF NOT EXISTS papers (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(review_id) ON DELETE CASCADE,
    doi VARCHAR(256),
    title TEXT NOT NULL,
    authors JSONB DEFAULT '[]'::jsonb,
    year INTEGER,
    journal TEXT,
    abstract TEXT,
    source_api VARCHAR(64) DEFAULT 'Federated', -- 'OpenAlex' | 'PubMed' | 'EuropePMC' | 'SciELO'
    doi_verified BOOLEAN DEFAULT FALSE,
    citation_count INTEGER DEFAULT 0,
    is_screened_in BOOLEAN DEFAULT TRUE,
    exclusion_reason TEXT,
    open_access_pdf_url TEXT,
    embedding vector(1536), -- Vector representation for semantic literature clustering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_papers_project_id ON papers(project_id);
CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);

-- 4. PRISMA Systematic Review Matrix Rows
CREATE TABLE IF NOT EXISTS prisma_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(64) REFERENCES projects(review_id) ON DELETE CASCADE,
    paper_id VARCHAR(128),
    citation_key VARCHAR(128) NOT NULL,
    doi VARCHAR(256) NOT NULL,
    title TEXT NOT NULL,
    population_n TEXT,
    intervention TEXT,
    comparator TEXT,
    outcomes TEXT,
    risk_of_bias VARCHAR(32) DEFAULT 'LOW', -- 'LOW' | 'SOME_CONCERNS' | 'HIGH' | 'UNCLEAR'
    statistical_soundness TEXT,
    traceable_quote TEXT,
    page_reference INTEGER,
    qualis_capes VARCHAR(8), -- 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'
    sjr_quartile VARCHAR(4), -- 'Q1', 'Q2', 'Q3', 'Q4'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prisma_project ON prisma_rows(project_id);
CREATE INDEX IF NOT EXISTS idx_prisma_doi ON prisma_rows(doi);

-- 5. Multi-Agent Lab Telemetry & Audit Logs
CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(64) REFERENCES projects(review_id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL, -- 'coordinator' | 'miner' | 'methodologist' | 'synthesizer'
    bench_id VARCHAR(64) NOT NULL, -- 'bench_coordinator' | 'bench_mining' | 'bench_auditing' | 'bench_synthesis' | 'bench_hitl'
    step VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL, -- 'WORK_STARTED' | 'PAPERS_FETCHED' | 'CHECKPOINT_REACHED' | 'APPROVED' | 'SYNTHESIS_COMPLETE'
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_project ON agent_events(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created ON agent_events(created_at DESC);
