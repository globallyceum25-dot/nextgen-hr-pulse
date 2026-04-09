

# API Documentation Generation Plan

## What We Are Building
A comprehensive API documentation file (Markdown) listing all database table endpoints, the edge function, request/response schemas, RLS access rules, and database functions. This will be generated as a downloadable artifact at `/mnt/documents/`.

## Scope

The document will cover:

1. **Database REST API Endpoints** -- All 14 tables with their Row, Insert, and Update schemas, RLS policies summarized per role, and available operations (SELECT/INSERT/UPDATE/DELETE).

2. **Edge Function: `create-user`** -- Method, URL pattern, authentication, Zod-validated request body schema, all response variants (success, error, duplicate).

3. **Database Functions** -- All 7 PL/pgSQL functions (`has_role`, `handle_new_user`, `generate_*_code`, `update_updated_at_column`) with signatures, security context, and usage.

4. **Enums** -- `app_role`, `task_priority`, `task_workflow_status`, `recurrence_type`.

5. **Storage API** -- `avatars` bucket endpoints and RLS.

6. **Authentication API** -- Login, signup, password change, session management via Supabase Auth.

## Technical Approach

- Run a Python script to generate a structured Markdown document
- Include Mermaid diagrams for: API architecture overview, request flow sequence
- Tables formatted with column name, type, nullable, default
- Each endpoint section includes: HTTP method, path pattern, auth requirements, request schema, response schema, error codes

## Deliverable
Single Markdown file: `/mnt/documents/NextGen_HCS_API_Documentation.md`

