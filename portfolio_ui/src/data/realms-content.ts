// src/data/realms-content.ts
// Rich content for the Mistral Realms dedicated showcase page

export interface RealmsTab {
  id: string;
  label: string;
  icon: string;
}

export interface CodeSnippet {
  title: string;
  description: string;
  explanation: string;
  code: string;
  language: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

export interface MermaidDiagram {
  title: string;
  description: string;
  code: string;
  imageSlug?: string;
}

export const REALMS_TABS: RealmsTab[] = [
  { id: 'overview', label: 'Overview', icon: '🏰' },
  { id: 'ai-engine', label: 'AI Engine', icon: '🧠' },
  { id: 'memory', label: 'Memory & Knowledge', icon: '📚' },
  { id: 'game-systems', label: 'Game Systems', icon: '⚔️' },
  { id: 'observability', label: 'Observability', icon: '📊' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
];

export const HERO_STATS = [
  { value: '16', label: 'Tool Functions', color: 'emerald' },
  { value: '6', label: 'AI Providers', color: 'teal' },
  { value: '30K+', label: 'D&D Entries', color: 'emerald' },
  { value: '40+', label: 'Metrics', color: 'teal' },
  { value: '42', label: 'Services', color: 'emerald' },
  { value: '~5wks', label: 'Build Time', color: 'teal' },
];

export const TECH_STACK_GROUPS = {
  'Backend': ['Python', 'FastAPI', 'SQLAlchemy 2.0', 'Pydantic v2', 'PyTorch'],
  'Frontend': ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'],
  'AI & ML': ['Mistral AI SDK', 'OpenAI SDK', 'sentence-transformers'],
  'Data': ['PostgreSQL', 'pgvector', 'Redis'],
  'Observability': ['OpenTelemetry', 'Jaeger', 'Prometheus', 'Grafana'],
  'Infrastructure': ['Docker'],
};

// ──────────────────────────────────────────────
// OVERVIEW TAB
// ──────────────────────────────────────────────

export const OVERVIEW_FEATURES: FeatureCard[] = [
  {
    title: 'AI Dungeon Master',
    description: 'Multi-iteration tool-calling loop processes up to 10 rounds of AI tool calls per player action, with provider fallback and DM Supervisor validation.',
    icon: '🎲',
    highlight: '16 tool functions',
  },
  {
    title: 'Multi-Provider Architecture',
    description: 'Priority-based selection across 6 providers (Mistral → Qwen → Groq → Cerebras → Together → SambaNova) with automatic failover and context transfer.',
    icon: '🔄',
    highlight: '6 AI providers',
  },
  {
    title: 'RAG Memory System',
    description: 'Adventure memories stored as 1024-dimensional Mistral embeddings, retrieved via pgvector cosine similarity and injected into the AI context window.',
    icon: '🧠',
    highlight: '1024d embeddings',
  },
  {
    title: 'DM Supervisor',
    description: 'Agentic validation layer that checks AI responses against D&D 5e rules using 9 regex patterns + semantic retrieval. Silent regeneration on violations.',
    icon: '⚖️',
    highlight: '9 validation patterns',
  },
  {
    title: 'Image Generation',
    description: 'AI-generated scene illustrations via Mistral Agents API with cosine-similarity scene detection, hash-based deduplication, and hourly quota management.',
    icon: '🎨',
    highlight: 'Mistral Agents API',
  },
  {
    title: 'Full Observability',
    description: 'OpenTelemetry distributed traces through Jaeger, 40+ Prometheus metrics, and Grafana dashboards — every AI call, tool execution, and provider switch is traced.',
    icon: '📊',
    highlight: '40+ metrics',
  },
];

export const ARCHITECTURE_DIAGRAM: MermaidDiagram = {
  title: 'System Architecture',
  description: 'Full system architecture showing the AI pipeline, multi-provider fallback, and observability stack',
  imageSlug: 'system-architecture',
  code: `graph TB
    subgraph Frontend
        UI[Game Interface]
        CC[Character Creator]
        AW[Adventure Wizard]
    end
    subgraph API["API Layer"]
        AUTH[Auth + JWT]
        CONV[Conversations]
        CHAR[Characters]
        SPELL[Spells + Effects]
        INV[Inventory + Loot]
        IMG[Image Generation]
        MEM[Memory API]
        COMP[Companions]
    end
    subgraph AI["AI Engine"]
        DM[DM Engine - Tool Calling Loop]
        SUP[DM Supervisor - Rule Validation]
        PRE[DM Preheater - Warmup Priming]
        ADPT[Adaptive Narration]
        PS[Provider Selector - Priority + Fallback]
    end
    subgraph Providers["AI Providers"]
        M[Mistral - mistral-small-latest]
        Q[Qwen - DashScope]
        G[Groq - llama-3.3-70b]
        C[Cerebras]
        T[Together.ai]
        S[SambaNova]
    end
    subgraph Intelligence["Intelligence Services"]
        EMB[Embedding Service - mistral-embed 1024d]
        SEM[Semantic Search - MiniLM-L12 384d]
        CTX[Context Window Manager - tiktoken 28K]
        SUMM[Summarization Service]
        CT[Context Transfer]
        IMG_DET[Scene Detection - Cosine Similarity]
    end
    subgraph Data["Data Layer"]
        PG[(PostgreSQL + pgvector)]
        RD[(Redis - Sessions + Cache)]
    end
    subgraph Obs["Observability"]
        JAE[Jaeger - Distributed Traces]
        PROM[Prometheus - 40+ Metrics]
        GRAF[Grafana - Dashboards]
    end
    UI --> CONV
    CC --> CHAR
    AW --> CONV
    CONV --> DM
    DM --> PRE
    DM --> SUP
    DM --> ADPT
    DM --> PS
    PS --> M
    PS --> Q
    PS --> G
    PS --> C
    PS --> T
    PS --> S
    PS --> CT
    CONV --> EMB --> MEM
    CONV --> IMG_DET --> IMG
    IMG --> M
    DM --> SEM
    DM --> CTX
    DM --> SUMM
    EMB --> PG
    SEM --> PG
    CHAR --> PG
    CONV --> PG
    CONV --> RD
    AUTH --> RD
    DM -.-> JAE
    PS -.-> PROM
    PROM --> GRAF`,
};

// ──────────────────────────────────────────────
// AI ENGINE TAB
// ──────────────────────────────────────────────

export const AI_ENGINE_SNIPPET: CodeSnippet = {
  title: 'DM Engine — Multi-Iteration Tool Calling Loop',
  description: 'The core AI orchestration loop that processes up to 10 rounds of tool calls per player action.',
  explanation: 'This method is the heart of the DM Engine (1,991 lines). On each player action, the AI can request tool calls (e.g., roll dice, look up creature stats, update HP). The loop executes those tools, feeds results back, and re-calls the AI — up to 10 iterations. If the DM Supervisor detects D&D rule violations, it silently injects rule reminders and regenerates. The player never sees the correction.',
  language: 'python',
  code: `async def call_dm_with_tools(
    self,
    messages: List[Dict[str, Any]],
    character: Character,
    db: AsyncSession,
    max_iterations: int = 10,
    player_input: Optional[str] = None,
) -> Dict[str, Any]:
    """Call AI provider with tool calling support.
    Implements a multi-iteration tool calling flow:
    1. DM calls tools → we execute them
    2. Feed results back → DM generates final narrative"""
    tool_calls_made = []
    character_updates = {}
    iteration = 0
    current_messages = messages.copy()

    while iteration < max_iterations:
        iteration += 1

        # Provider fallback loop — try each in priority order
        response = None
        for provider in self.provider_selector.providers:
            if not await provider.is_available():
                continue
            try:
                response = await self._call_provider_with_tools(
                    provider, current_messages
                )
                break  # success
            except Exception as provider_err:
                logger.warning(f"Provider {provider.name} failed: {provider_err}")
                continue

        if response is None:
            raise Exception("All AI providers failed for tool calling.")

        assistant_message = response.choices[0].message

        # No tools called → final narrative
        if not assistant_message.tool_calls:
            narration = assistant_message.content or ""
            # Parse text-based tool calls as fallback
            narration, text_tools, text_updates = (
                await self._parse_and_execute_text_tool_calls(
                    narration, character, db
                )
            )

            # RL-140: Validate with DM Supervisor
            if player_input:
                supervisor = get_dm_supervisor()
                if supervisor.detect_triggers(player_input, narration):
                    validation = await supervisor.validate_response(
                        player_input=player_input,
                        dm_response=narration,
                        tool_calls=tool_calls_made,
                    )
                    if validation["should_regenerate"]:
                        # Inject rule reminders → silent regeneration
                        current_messages.append({
                            "role": "system",
                            "content": f"RULE REMINDER:\\n"
                            f"{chr(10).join(validation['relevant_rules'])}"
                        })
                        continue  # Loop back

            return {
                "narration": narration,
                "tool_calls_made": tool_calls_made,
                "character_updates": character_updates,
            }

        # Execute each tool the AI requested
        for tool_call in assistant_message.tool_calls:
            tool_result = await execute_tool(
                tool_name=tool_call.function.name,
                tool_arguments=json.loads(tool_call.function.arguments),
                character=character, db=db,
            )
            tool_calls_made.append({
                "name": tool_call.function.name,
                "result": tool_result,
            })

            # Add tool result to messages for next iteration
            current_messages.append({
                "role": "tool",
                "name": tool_call.function.name,
                "content": json.dumps(tool_result),
                "tool_call_id": tool_call.id,
            })
        # Continue loop — re-call AI with tool results`,
};

export const PROVIDER_SNIPPET: CodeSnippet = {
  title: 'Provider Selector — Priority Fallback with Context Transfer',
  description: 'Manages 6 AI providers with automatic failover and context transfer on provider switches.',
  explanation: 'When a provider fails (rate limit, network error, etc.), the selector silently moves to the next available provider. The key innovation is context transfer: when switching providers, it generates a session summary and injects it into the new provider\'s message history, so the story continues seamlessly despite the backend switch.',
  language: 'python',
  code: `class ProviderSelector:
    """Selects AI providers based on availability and priority.
    Handles automatic fallback when providers are unavailable."""

    def __init__(self):
        self.providers: List[AIProvider] = []
        self.current_provider: Optional[AIProvider] = None
        self.last_provider_name: Optional[str] = None
        self.context_transfer_service = ContextTransferService()

    def register_provider(self, provider: AIProvider):
        self.providers.append(provider)
        self.providers.sort(key=lambda p: p.priority)

    async def select_provider(self) -> AIProvider:
        """Select the best available provider by priority."""
        for provider in self.providers:
            if await provider.is_available():
                if self.current_provider != provider:
                    old = self.current_provider.name if self.current_provider else None
                    logger.info(f"Switching provider: {old} -> {provider.name}")
                self.current_provider = provider
                return provider
        raise ProviderUnavailableError("No AI providers available")

    async def generate_chat(
        self, messages, max_tokens, temperature,
        db=None, session_id=None, character=None, **kwargs
    ) -> str:
        """Generate chat with automatic fallback + context transfer."""
        selected = await self.select_provider()

        # Context transfer on provider switch
        if (self.last_provider_name
                and selected.name != self.last_provider_name
                and db and session_id and character):
            context_summary = await self.context_transfer_service\\
                .generate_session_summary(
                    db=db, session_id=session_id, character=character,
                )
            context_msg = {
                "role": "system",
                "content": self.context_transfer_service\\
                    .format_context_transfer(
                        session_summary=context_summary,
                        recent_messages=messages[-10:],
                    ),
            }
            messages = [messages[0], context_msg] + messages[1:]

        # Try each provider in priority order
        for provider in self.providers:
            if not await provider.is_available():
                continue
            try:
                result = await provider.generate_chat(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature, **kwargs
                )
                return result
            except (RateLimitError, ProviderUnavailableError, Exception):
                continue  # Try next provider
        raise ProviderUnavailableError("All AI providers failed")`,
};

export const TOOL_CALLING_FLOW: MermaidDiagram = {
  title: 'Tool Calling Flow',
  description: 'How the DM Engine processes a single player action through the tool-calling loop',
  imageSlug: 'tool-calling-flow',
  code: `sequenceDiagram
    participant P as Player
    participant API as FastAPI
    participant DM as DM Engine
    participant PS as Provider Selector
    participant AI as AI Provider
    participant T as Tool Executor
    participant SUP as DM Supervisor
    participant DB as PostgreSQL

    P->>API: Player action
    API->>DM: Process action
    DM->>PS: Select provider
    PS->>AI: Generate (with tools)
    AI-->>DM: Tool calls requested
    
    loop Up to 10 iterations
        DM->>T: Execute tool
        T->>DB: Query/Update
        DB-->>T: Result
        T-->>DM: Tool result
        DM->>AI: Results + re-generate
        AI-->>DM: More tools or narrative
    end

    DM->>SUP: Validate narrative
    SUP->>DB: Check D&D 5e rules
    alt Rule violation
        SUP-->>DM: Regenerate with rules
        DM->>AI: Re-generate with reminders
    else Valid
        SUP-->>DM: Approved
    end
    DM-->>API: Final narrative + updates
    API-->>P: Streamed response`,
};

// ──────────────────────────────────────────────
// MEMORY & KNOWLEDGE TAB
// ──────────────────────────────────────────────

export const MEMORY_SNIPPET: CodeSnippet = {
  title: 'Memory Service — RAG Retrieval via pgvector',
  description: 'Retrieves relevant adventure memories by embedding the current situation with Mistral\'s API.',
  explanation: 'Each player action triggers a memory search: the current situation is embedded using mistral-embed (1024d vectors), then compared against all stored memories via pgvector\'s cosine distance operator (<=>). High-similarity memories are formatted with importance indicators and injected into the AI\'s context window, giving the DM awareness of past events.',
  language: 'python',
  code: `class MemoryService:
    """Service for managing adventure memories with semantic search"""

    @staticmethod
    async def search_memories(
        db: AsyncSession,
        session_id: uuid.UUID,
        query: str,
        limit: int = 10,
        min_importance: Optional[int] = None,
        event_types: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
    ) -> List[AdventureMemory]:
        """Search memories using semantic similarity"""
        # Generate query embedding via Mistral API (1024d)
        embedding_service = get_embedding_service()
        query_embedding = await embedding_service.generate_embedding(query)

        if not query_embedding:
            # Fallback to text search if embedding fails
            return await MemoryService._text_search_fallback(
                db, session_id, query, limit,
                min_importance, event_types, tags
            )

        # Build filter conditions
        conditions = [AdventureMemory.session_id == session_id]
        if min_importance:
            conditions.append(AdventureMemory.importance >= min_importance)
        if event_types:
            conditions.append(AdventureMemory.event_type.in_(event_types))

        # pgvector cosine similarity query
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        similarity_expr = literal_column(
            f"(1 - (embedding::vector <=> '{embedding_str}'::vector))"
        )

        stmt = (
            select(AdventureMemory)
            .where(and_(*conditions))
            .order_by(desc(similarity_expr))
            .limit(limit)
        )

        result = await db.execute(stmt)
        memories = list(result.scalars().all())

        # Post-query tag filtering (JSONB array)
        if tags:
            memories = [
                m for m in memories
                if m.tags and any(tag in m.tags for tag in tags)
            ][:limit]

        return memories

    @staticmethod
    async def get_context_for_ai(
        db: AsyncSession, session_id: uuid.UUID,
        current_situation: str, max_memories: int = 5,
    ) -> str:
        """Get formatted memory context for AI DM (RAG injection)"""
        memories = await MemoryService.search_memories(
            db=db, session_id=session_id,
            query=current_situation,
            limit=max_memories, min_importance=6,
        )
        if not memories:
            return "No relevant past events found."

        formatted = []
        for i, memory in enumerate(memories, 1):
            importance = "⭐" * min(memory.importance, 10)
            entry = f"{i}. [{memory.event_type.value.upper()}] {importance}\\n"
            entry += f"   Time: {memory.timestamp.strftime('%Y-%m-%d %H:%M')}\\n"
            entry += f"   Event: {memory.content}\\n"
            if memory.locations:
                entry += f"   Location: {', '.join(memory.locations)}\\n"
            if memory.npcs_involved:
                entry += f"   NPCs: {len(memory.npcs_involved)} involved\\n"
            formatted.append(entry)
        return "\\n".join(formatted)`,
};

export const MEMORY_PIPELINE: MermaidDiagram = {
  title: 'RAG Memory Pipeline',
  description: 'How memories flow from player actions to AI context injection',
  imageSlug: 'rag-memory-pipeline',
  code: `graph LR
    PA[Player Action] --> EE[Embed Event]
    EE --> |mistral-embed 1024d| PG[(pgvector)]
    
    PA --> QE[Embed Query]
    QE --> CS[Cosine Similarity]
    PG --> CS
    CS --> |Top-K memories| FMT[Format Context]
    FMT --> |RAG injection| AI[AI Context Window]
    
    subgraph Fallback
        TF[Text Search ILIKE]
    end
    QE -.-> |embed fails| TF
    TF -.-> FMT`,
};

export const KNOWLEDGE_STATS = [
  { value: '14,000+', label: 'Items', description: 'Weapons, armor, equipment, magic items' },
  { value: '11,000+', label: 'Monsters', description: 'Creatures with full stat blocks and abilities' },
  { value: '4,000+', label: 'Spells', description: 'All D&D 5e spells with components and effects' },
  { value: '1,024', label: 'Dimensions', description: 'Mistral embedding vector dimensionality' },
  { value: '384', label: 'Dimensions (local)', description: 'MiniLM-L12 for fast local semantic search' },
  { value: '28K', label: 'Token Budget', description: 'tiktoken context window management' },
];

// ──────────────────────────────────────────────
// GAME SYSTEMS TAB
// ──────────────────────────────────────────────

export const TOOL_FUNCTIONS = [
  { name: 'request_player_roll', description: 'Request dice rolls for ability checks, saving throws, or attacks', category: 'Core' },
  { name: 'update_character_hp', description: 'Modify character hit points — negative for damage, positive for healing', category: 'Core' },
  { name: 'consume_spell_slot', description: 'Track and consume spell slots by level when casting spells', category: 'Magic' },
  { name: 'get_creature_stats', description: 'Retrieve full stat blocks from the 11K monster database (fuzzy matching)', category: 'Knowledge' },
  { name: 'search_items', description: 'Search the 14K item database for weapons, armor, and magic items', category: 'Knowledge' },
  { name: 'search_monsters', description: 'Search the 11K creature database by name, type, or CR range', category: 'Knowledge' },
  { name: 'search_spells', description: 'Search the 4K spell database by name, level, or school', category: 'Knowledge' },
  { name: 'search_memories', description: 'Search adventure memories for context via semantic similarity', category: 'Knowledge' },
  { name: 'roll_for_npc', description: 'Roll dice for NPCs and monsters — attacks, saves, initiative, damage', category: 'Combat' },
  { name: 'give_item', description: 'Give items to the player character inventory', category: 'Inventory' },
  { name: 'introduce_companion', description: 'Create AI companion NPC with personality, goals, and backstory', category: 'Companion' },
  { name: 'companion_suggest_action', description: 'Companion suggests tactical options based on personality and knowledge', category: 'Companion' },
  { name: 'companion_share_knowledge', description: 'Companion shares relevant lore, history, or strategic information', category: 'Companion' },
  { name: 'get_monster_loot', description: 'Generate loot drops from defeated monsters based on CR and type', category: 'Loot' },
  { name: 'generate_treasure_hoard', description: 'Generate level-appropriate treasure hoards from D&D loot tables', category: 'Loot' },
  { name: 'list_available_tools', description: 'Show all available DM tools and their descriptions', category: 'Meta' },
];

export const DM_SUPERVISOR_PATTERNS = [
  { pattern: 'damage > max_damage', description: 'Catches impossible damage values that exceed weapon/spell maximums' },
  { pattern: 'HP overflow detection', description: 'Prevents healing above maximum hit points' },
  { pattern: 'spell slot validation', description: 'Ensures spells use correct slot levels and available slots' },
  { pattern: 'action economy check', description: 'Validates creatures don\'t exceed their allowed actions per turn' },
  { pattern: 'ability score bounds', description: 'Flags ability scores outside valid 1-30 range' },
  { pattern: 'level-appropriate CR', description: 'Warns when encounter CR is far above party level' },
  { pattern: 'death save rules', description: 'Enforces correct death saving throw mechanics' },
  { pattern: 'concentration spell conflicts', description: 'Catches attempts to concentrate on multiple spells' },
  { pattern: 'proficiency bonus validation', description: 'Ensures proficiency bonus matches character level' },
];

// ──────────────────────────────────────────────
// OBSERVABILITY TAB
// ──────────────────────────────────────────────

export const METRICS_CATEGORIES = [
  {
    category: 'AI Provider Metrics',
    metrics: [
      'ai_provider_requests_total — Counter by provider, model, status',
      'ai_provider_latency_seconds — Histogram of response times',
      'ai_provider_tokens_total — Token usage (prompt + completion)',
      'ai_provider_fallback_total — Provider switch events',
      'ai_provider_rate_limit_total — Rate limit hits per provider',
    ],
  },
  {
    category: 'Tool Calling Metrics',
    metrics: [
      'tool_execution_total — Tool calls by name and outcome',
      'tool_execution_duration_seconds — Per-tool latency',
      'tool_iterations_per_action — Iterations before final narrative',
      'dm_supervisor_validations_total — Rule checks triggered',
      'dm_supervisor_regenerations_total — Silent re-generations',
    ],
  },
  {
    category: 'Memory & Knowledge Metrics',
    metrics: [
      'embedding_generation_total — Embedding API calls',
      'memory_search_latency_seconds — pgvector query time',
      'knowledge_base_queries_total — D&D 5e lookups',
      'context_window_tokens — Current context utilization',
      'context_summarization_total — Automatic summarizations',
    ],
  },
  {
    category: 'Game Session Metrics',
    metrics: [
      'active_sessions_gauge — Currently active game sessions',
      'player_actions_total — Actions processed by type',
      'narration_length_chars — Narrative response lengths',
      'image_generation_total — Scene images created',
      'session_duration_seconds — Time per game session',
    ],
  },
];

export const OBSERVABILITY_DIAGRAM: MermaidDiagram = {
  title: 'Observability Stack',
  description: 'How traces, metrics, and logs flow through the observability pipeline',
  imageSlug: 'observability-stack',
  code: `graph TB
    subgraph App["Application Layer"]
        FP[FastAPI + middleware]
        DM[DM Engine spans]
        PS[Provider Selector spans]
        TE[Tool Executor spans]
    end
    
    subgraph OTEL["OpenTelemetry"]
        SDK[OTel Python SDK]
        EXP[OTLP Exporter]
    end
    
    subgraph Storage["Backends"]
        J[Jaeger - Traces]
        P[Prometheus - Metrics]
        G[Grafana - Dashboards]
    end
    
    FP --> SDK
    DM --> SDK
    PS --> SDK
    TE --> SDK
    SDK --> EXP
    EXP --> J
    FP --> |/metrics endpoint| P
    P --> G
    J --> G`,
};

// ──────────────────────────────────────────────
// INFRASTRUCTURE TAB
// ──────────────────────────────────────────────

export const INFRASTRUCTURE_FEATURES: FeatureCard[] = [
  {
    title: 'Docker Compose Orchestration',
    description: '7-service Docker Compose stack with health checks, dependency ordering, named volumes, and separate profiles for development/production.',
    icon: '🐳',
    highlight: '7 services',
  },
  {
    title: 'Multi-Stage Docker Builds',
    description: 'Optimized Dockerfiles with multi-stage builds, pip cache mounts, non-root users, and minimal Alpine-based images for production.',
    icon: '📦',
    highlight: 'Optimized images',
  },
  {
    title: 'JWT + CSRF Security',
    description: 'Stateless JWT authentication with refresh token rotation, CSRF double-submit cookies, and Redis-backed session management.',
    icon: '🔒',
    highlight: 'Token rotation',
  },
  {
    title: 'Database Migrations',
    description: 'Alembic-managed schema migrations with pgvector extension, JSONB columns, and proper foreign key relationships.',
    icon: '🗄️',
    highlight: 'Alembic + pgvector',
  },
  {
    title: 'CI/CD Pipeline',
    description: 'GitHub Actions workflow with automated testing, Docker image builds, and deployment to cloud infrastructure.',
    icon: '🚀',
    highlight: 'GitHub Actions',
  },
];

export const DOCKER_SERVICES = [
  { name: 'frontend', tech: 'Next.js 16', port: '3000' },
  { name: 'backend', tech: 'FastAPI', port: '8000' },
  { name: 'postgres', tech: 'PostgreSQL 16 + pgvector', port: '5432' },
  { name: 'redis', tech: 'Redis 7 Alpine', port: '6379' },
  { name: 'jaeger', tech: 'Jaeger All-in-One', port: '16686' },
  { name: 'prometheus', tech: 'Prometheus', port: '9090' },
  { name: 'grafana', tech: 'Grafana', port: '3001' },
];

export const INFRA_DIAGRAM: MermaidDiagram = {
  title: 'Docker Compose Architecture',
  description: 'Service relationships and networking in the Docker Compose stack',
  imageSlug: 'docker-compose-architecture',
  code: `graph TB
    subgraph External
        U[User Browser]
    end
    
    subgraph Docker["Docker Compose Network"]
        FE[Frontend :3000]
        BE[Backend :8000]
        PG[(PostgreSQL :5432)]
        RD[(Redis :6379)]
        JAE[Jaeger :16686]
        PROM[Prometheus :9090]
        GRAF[Grafana :3001]
    end
    
    U --> FE
    FE --> BE
    BE --> PG
    BE --> RD
    BE -.-> |OTLP traces| JAE
    BE -.-> |/metrics| PROM
    PROM --> GRAF
    PG -.-> |health: pg_isready| BE
    RD -.-> |health: redis-cli ping| BE`,
};
