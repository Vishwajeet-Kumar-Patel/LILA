FROM node:18-alpine AS builder

# Add git as it's required to install dependencies from GitHub
RUN apk add --no-cache git

WORKDIR /backend
COPY package*.json ./
RUN npm install
COPY . .

# Ensure the modules directory exists and build
RUN mkdir -p modules && npm run build

FROM heroiclabs/nakama:3.18.0
COPY --from=builder /backend/modules/*.js /nakama/data/modules/
COPY --from=builder /backend/entrypoint.sh /nakama/data/entrypoint.sh

# Override the default Nakama entrypoint to allow our script to run
ENTRYPOINT []
CMD ["/bin/sh", "/nakama/data/entrypoint.sh"]
