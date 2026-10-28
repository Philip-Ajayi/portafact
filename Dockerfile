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
