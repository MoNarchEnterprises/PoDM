## F-06: Contest Winner Selection Flow

Flowchart showing the two winner selection algorithms (standard and weighted spend) and their shared finalization step.

```mermaid
flowchart TD
    A["Entry period ends<br/>Creator clicks 'Finalize' on contest"] --> B["ContestEntryModel.findByContestId(contestId)<br/>Fetch all active entries"]
    B --> C{"contest.winnerSelection?"}

    subgraph Standard["Standard Algorithm"]
        D4a["Generate randomIndex =<br/>Math.floor(Math.random() * entries.length)"]
        D5a["Select entries[randomIndex] as winner"]
    end

    subgraph Weighted["Weighted Spend Algorithm"]
        D4b["For each entrant:<br/>TransactionModel.getTotalSpendByUser(<br/>  entrant.userId, contestId)"]
        D5b["Compute tickets per entrant:<br/>tickets = 1 + Math.floor(<br/>  totalSpend / spendThreshold<br/>) * additionalEntries"]
        D6b["Build weighted array:<br/>each entrant appears tickets times"]
        D7b["Generate random index<br/>against weighted array"]
        D8b["Select corresponding entrant as winner"]
    end

    C -->|"standard"| D4a
    C -->|"weighted_spend"| D4b
    D4a --> D5a
    D4b --> D5b --> D6b --> D7b --> D8b
    D5a --> E
    D8b --> E
    E["ContestModel.finalize(contestId, winnerEntryId)<br/>Update contest record"] --> F["Winner announced in contest UI"]

    style A fill:#2196f3,color:#fff
    style D4a fill:#4caf50,color:#fff
    style D4b fill:#ff9800,color:#fff
    style E fill:#9c27b0,color:#fff
```

Three issues are flagged: 🔴 **Not cryptographically secure** — `Math.random()` is used for winner selection without verifiable randomness; 🔴 **No audit trail** — there is no record of the random seed, algorithm inputs, or selected winner's probability; 🟡 **Weighted algorithm queries `transactions` table** with real dollar amounts, raising privacy concerns for entrants.
