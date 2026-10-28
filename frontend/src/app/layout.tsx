import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PortaFact | Autonomous RWA Factoring & Default-Insured Tranche Vault",
  description: "Enterprise accounts receivable factoring powered by Portaldot V3.0 EVM and Layer-0 Default-as-a-Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-gray-100 antialiased">{children}</body>
    </html>
  );
}
```

---

#### `Dockerfile` (at root)
```dockerfile
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY relayer/package*.json ./relayer/
RUN cd relayer && npm install

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY relayer ./relayer
COPY frontend ./frontend

ARG NEXT_PUBLIC_POT_TOKEN_ADDRESS
ARG NEXT_PUBLIC_INVOICE_NFT_ADDRESS
ARG NEXT_PUBLIC_TRANCHE_VAULT_ADDRESS
ARG NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS
ARG PORTALDOT_EVM_RPC

ENV NEXT_PUBLIC_POT_TOKEN_ADDRESS=$NEXT_PUBLIC_POT_TOKEN_ADDRESS
ENV NEXT_PUBLIC_INVOICE_NFT_ADDRESS=$NEXT_PUBLIC_INVOICE_NFT_ADDRESS
ENV NEXT_PUBLIC_TRANCHE_VAULT_ADDRESS=$NEXT_PUBLIC_TRANCHE_VAULT_ADDRESS
ENV NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS=$NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS
ENV PORTALDOT_EVM_RPC=$PORTALDOT_EVM_RPC

RUN cd frontend && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/relayer ./relayer
COPY entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]
```

#### `entrypoint.sh` (at root)
```bash
#!/bin/sh
set -e

TARGET_PORT="${PORT:-3000}"

echo "=========================================================="
echo "⚡ Starting PortaFact DaaS Relayer Daemon in background..."
echo "=========================================================="
(
  cd /app/relayer
  npx ts-node daas-relayer.ts 2>&1 | sed 's/^/[RELAYER] /'
) &
RELAYER_PID=$!

echo "=========================================================="
echo "🌐 Starting Next.js Web Interface on 0.0.0.0:$TARGET_PORT"
echo "=========================================================="
cd /app/frontend

trap "kill -TERM $RELAYER_PID; exit 0" SIGINT SIGTERM

exec npx next start -H 0.0.0.0 -p "$TARGET_PORT"
```

---

---

### Verification and Execution Steps

To run the entire system end-to-end:

1. **Compile & Run Test Suite:**
   ```bash
   forge test -vvv
   ```
   *Expected result: All unit and invariant tests in `PortaFact.t.sol` pass, confirming 14-decimal arithmetic safety and capital preservation.*

2. **Deploy to Portaldot EVM / Local Node:**
   ```bash
   forge script script/DeployPortaFact.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
   ```

3. **Start the Portaldot DaaS Substrate Relayer Daemon:**
   ```bash
   cd relayer
   npm install
   npm run start
   ```

4. **Launch the User Interface:**
   ```bash
   cd frontend
   npm install
   npm run dev
