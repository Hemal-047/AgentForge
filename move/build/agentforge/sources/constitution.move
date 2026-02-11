module agentforge::constitution {
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;

    // ============ Error Codes ============
    const ENotOwner: u64 = 0;
    const ENotAgent: u64 = 1;
    const EBudgetExceeded: u64 = 2;
    const EDailyLimitExceeded: u64 = 3;
    const EAgentDead: u64 = 4;
    const EAlreadyDead: u64 = 5;
    const EInsufficientTreasury: u64 = 6;
    const ECategoryLimitExceeded: u64 = 7;

    // ============ Constants ============
    const MS_PER_DAY: u64 = 86_400_000;

    // ============ Structs ============
    /// The Agent Constitution — blockchain-enforced rules for the agent
    /// Shared object so both owner and agent can interact
    public struct AgentConstitution has key {
        id: UID,
        // Identity
        owner: address,
        // Human who controls the kill switch
        agent: address,
        // Agent's own wallet
        name: vector<u8>,
        description: vector<u8>,

        // Budget rules
        daily_spend_limit: u64,
        // Max SUI (in MIST) per day
        per_action_limit: u64,
        // Max SUI per single action

        // Tracking
        total_spent_today: u64,
        total_spent_all_time: u64,
        day_start_timestamp: u64,
        total_actions: u64,
        total_heartbeats: u64,

        // State
        is_alive: bool,
        created_at: u64,
        last_heartbeat: u64,

        // Treasury — agent's operational funds held by the contract
        treasury: Balance<SUI>,
    }

    /// Registry of all agents (shared object)
    public struct ForgeRegistry has key {
        id: UID,
        total_agents: u64,
        total_actions: u64,
    }

    // ============ Events ============
    public struct AgentSpawned has copy, drop {
        constitution_id: ID,
        owner: address,
        agent: address,
        name: vector<u8>,
        daily_limit: u64,
        timestamp: u64,
    }

    public struct SpendAuthorized has copy, drop {
        constitution_id: ID,
        agent: address,
        amount: u64,
        category: vector<u8>,
        reason_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        remaining_daily: u64,
        timestamp: u64,
    }

    public struct SpendDenied has copy, drop {
        constitution_id: ID,
        agent: address,
        amount: u64,
        category: vector<u8>,
        reason: vector<u8>,
        timestamp: u64,
    }

    public struct HeartbeatLogged has copy, drop {
        constitution_id: ID,
        agent: address,
        heartbeat_number: u64,
        walrus_blob_id: vector<u8>,
        treasury_balance: u64,
        timestamp: u64,
    }

    public struct ActionReported has copy, drop {
        constitution_id: ID,
        agent: address,
        action_type: vector<u8>,
        action_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        timestamp: u64,
    }

    public struct AgentKilled has copy, drop {
        constitution_id: ID,
        killed_by: address,
        reason: vector<u8>,
        timestamp: u64,
    }

    public struct AgentRevived has copy, drop {
        constitution_id: ID,
        revived_by: address,
        timestamp: u64,
    }

    public struct TreasuryFunded has copy, drop {
        constitution_id: ID,
        funder: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    public struct TreasuryWithdrawn has copy, drop {
        constitution_id: ID,
        amount: u64,
        recipient: address,
        remaining: u64,
        timestamp: u64,
    }

    // ============ Init ============
    fun init(ctx: &mut TxContext) {
        let registry = ForgeRegistry {
            id: object::new(ctx),
            total_agents: 0,
            total_actions: 0,
        };
        transfer::share_object(registry);
    }

    // ============ Spawn Agent ============
    /// Create a new agent with its constitution.
    /// Owner provides initial treasury funds.
    public entry fun spawn_agent(
        registry: &mut ForgeRegistry,
        name: vector<u8>,
        description: vector<u8>,
        agent_address: address,
        daily_spend_limit: u64,
        per_action_limit: u64,
        initial_funds: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        let fund_amount = coin::value(&initial_funds);
        let constitution = AgentConstitution {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            agent: agent_address,
            name,
            description,
            daily_spend_limit,
            per_action_limit,
            total_spent_today: 0,
            total_spent_all_time: 0,
            day_start_timestamp: now,
            total_actions: 0,
            total_heartbeats: 0,
            is_alive: true,
            created_at: now,
            last_heartbeat: now,
            treasury: coin::into_balance(initial_funds),
        };
        registry.total_agents = registry.total_agents + 1;
        event::emit(AgentSpawned {
            constitution_id: object::id(&constitution),
            owner: tx_context::sender(ctx),
            agent: agent_address,
            name: constitution.name,
            daily_limit: daily_spend_limit,
            timestamp: now,
        });
        event::emit(TreasuryFunded {
            constitution_id: object::id(&constitution),
            funder: tx_context::sender(ctx),
            amount: fund_amount,
            new_balance: fund_amount,
            timestamp: now,
        });
        transfer::share_object(constitution);
    }

    // ============ Agent Actions ============
    /// Agent requests to spend SUI. Contract enforces budget.
    /// If approved, funds are withdrawn from treasury to agent.
    public entry fun authorize_spend(
        registry: &mut ForgeRegistry,
        constitution: &mut AgentConstitution,
        amount: u64,
        category: vector<u8>,
        reason_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == constitution.agent, ENotAgent);
        assert!(constitution.is_alive, EAgentDead);

        let now = clock::timestamp_ms(clock);

        // Reset daily counter if new day
        if (now - constitution.day_start_timestamp >= MS_PER_DAY) {
            constitution.total_spent_today = 0;
            constitution.day_start_timestamp = now;
        };

        // Check per-action limit
        if (amount > constitution.per_action_limit) {
            event::emit(SpendDenied {
                constitution_id: object::id(constitution),
                agent: sender,
                amount,
                category,
                reason: b"per_action_limit_exceeded",
                timestamp: now,
            });
            abort ECategoryLimitExceeded
        };

        // Check daily limit
        if (constitution.total_spent_today + amount > constitution.daily_spend_limit) {
            event::emit(SpendDenied {
                constitution_id: object::id(constitution),
                agent: sender,
                amount,
                category,
                reason: b"daily_limit_exceeded",
                timestamp: now,
            });
            abort EDailyLimitExceeded
        };

        // Check treasury has enough
        assert!(balance::value(&constitution.treasury) >= amount, EInsufficientTreasury);

        // Approved — update counters
        constitution.total_spent_today = constitution.total_spent_today + amount;
        constitution.total_spent_all_time = constitution.total_spent_all_time + amount;
        constitution.total_actions = constitution.total_actions + 1;
        registry.total_actions = registry.total_actions + 1;

        // Withdraw from treasury and send to agent
        let payment = coin::from_balance(balance::split(&mut constitution.treasury, amount), ctx);
        transfer::public_transfer(payment, constitution.agent);

        let remaining = constitution.daily_spend_limit - constitution.total_spent_today;
        event::emit(SpendAuthorized {
            constitution_id: object::id(constitution),
            agent: sender,
            amount,
            category,
            reason_hash,
            walrus_blob_id,
            remaining_daily: remaining,
            timestamp: now,
        });
    }

    /// Agent logs a heartbeat — proof of life
    public entry fun heartbeat(
        constitution: &mut AgentConstitution,
        walrus_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == constitution.agent, ENotAgent);
        assert!(constitution.is_alive, EAgentDead);

        let now = clock::timestamp_ms(clock);
        constitution.last_heartbeat = now;
        constitution.total_heartbeats = constitution.total_heartbeats + 1;

        event::emit(HeartbeatLogged {
            constitution_id: object::id(constitution),
            agent: sender,
            heartbeat_number: constitution.total_heartbeats,
            walrus_blob_id,
            treasury_balance: balance::value(&constitution.treasury),
            timestamp: now,
        });
    }

    /// Agent reports an action it took (monitoring, alerting, etc.)
    public entry fun report_action(
        registry: &mut ForgeRegistry,
        constitution: &mut AgentConstitution,
        action_type: vector<u8>,
        action_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == constitution.agent, ENotAgent);
        assert!(constitution.is_alive, EAgentDead);

        let now = clock::timestamp_ms(clock);
        constitution.total_actions = constitution.total_actions + 1;
        registry.total_actions = registry.total_actions + 1;

        event::emit(ActionReported {
            constitution_id: object::id(constitution),
            agent: sender,
            action_type,
            action_hash,
            walrus_blob_id,
            timestamp: now,
        });
    }

    // ============ Owner Controls ============
    /// Fund the agent's treasury (anyone can fund)
    public entry fun fund_treasury(
        constitution: &mut AgentConstitution,
        funds: Coin<SUI>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let amount = coin::value(&funds);
        balance::join(&mut constitution.treasury, coin::into_balance(funds));
        event::emit(TreasuryFunded {
            constitution_id: object::id(constitution),
            funder: tx_context::sender(ctx),
            amount,
            new_balance: balance::value(&constitution.treasury),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Owner withdraws funds from treasury
    public entry fun withdraw_treasury(
        constitution: &mut AgentConstitution,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == constitution.owner, ENotOwner);
        assert!(balance::value(&constitution.treasury) >= amount, EInsufficientTreasury);
        let withdrawn = coin::from_balance(balance::split(&mut constitution.treasury, amount), ctx);
        transfer::public_transfer(withdrawn, constitution.owner);
        event::emit(TreasuryWithdrawn {
            constitution_id: object::id(constitution),
            amount,
            recipient: constitution.owner,
            remaining: balance::value(&constitution.treasury),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Kill the agent — emergency stop (owner only)
    public entry fun kill_agent(
        constitution: &mut AgentConstitution,
        reason: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == constitution.owner, ENotOwner);
        assert!(constitution.is_alive, EAlreadyDead);
        constitution.is_alive = false;
        event::emit(AgentKilled {
            constitution_id: object::id(constitution),
            killed_by: tx_context::sender(ctx),
            reason,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Revive the agent (owner only)
    public entry fun revive_agent(
        constitution: &mut AgentConstitution,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == constitution.owner, ENotOwner);
        constitution.is_alive = true;
        constitution.last_heartbeat = clock::timestamp_ms(clock);
        event::emit(AgentRevived {
            constitution_id: object::id(constitution),
            revived_by: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update daily spend limit (owner only)
    public entry fun update_daily_limit(
        constitution: &mut AgentConstitution,
        new_limit: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == constitution.owner, ENotOwner);
        constitution.daily_spend_limit = new_limit;
    }

    /// Update per-action limit (owner only)
    public entry fun update_action_limit(
        constitution: &mut AgentConstitution,
        new_limit: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == constitution.owner, ENotOwner);
        constitution.per_action_limit = new_limit;
    }

    // ============ Seal Access Control ============
    /// Seal key servers call this to verify who can decrypt agent logs
    entry fun seal_approve(
        id: vector<u8>,
        constitution: &AgentConstitution,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == constitution.owner || sender == constitution.agent, ENotOwner);
    }

    // ============ View Functions ============
    public fun get_constitution_info(c: &AgentConstitution): (
        address,
        address,
        vector<u8>,
        u64,
        u64,
        u64,
        u64,
        bool,
        u64,
    ) {
        (
            c.owner,
            c.agent,
            c.name,
            c.daily_spend_limit,
            c.total_spent_today,
            c.total_spent_all_time,
            c.total_actions,
            c.is_alive,
            balance::value(&c.treasury),
        )
    }
}
