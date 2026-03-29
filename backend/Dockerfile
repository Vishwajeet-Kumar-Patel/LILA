FROM node:node:18-alpine AS builder

WORKDIR /backend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM heroiclabs/nakama:3.18.0
COPY --from=builder /backend/modules/*.js /nakama/data/modules/
COPY --from=builder /backend/data/local.yml /nakama/data/local.yml
