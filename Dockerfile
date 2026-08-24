FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8085

# Copy only the standalone runtime output.
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 8085

CMD ["node", "server.js"]
