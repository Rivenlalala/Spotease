FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build with production environment
ENV NODE_ENV=production
ENV VITE_API_BASE_URL=https://api.spotease.rivenlalala.xyz
ENV VITE_WS_URL=wss://api.spotease.rivenlalala.xyz/ws/conversions
RUN npm run build

FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set up permissions for non-root nginx user
# The nginx:alpine image already has nginx user/group
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Override CMD to use non-privileged port binding
CMD ["nginx", "-g", "daemon off;"]
