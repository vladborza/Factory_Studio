FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node dist ./dist
COPY --chown=node:node services/gateway.mjs ./services/gateway.mjs
USER node
EXPOSE 4173
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
