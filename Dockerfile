# --- Stage 1: Builder (Build Frontend & Dependencies) ---
FROM node:20-slim AS builder

WORKDIR /app

# Cài đặt các công cụ biên dịch cho native module (như better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Sao chép package.json và lock file
COPY package*.json ./

# Dùng npm ci thay vì npm install cho build deterministic và nhanh hơn
RUN npm ci

# Sao chép toàn bộ mã nguồn để build (Vite frontend)
COPY . .

# Build ứng dụng (Tạo thư mục dist)
RUN npm run build


# --- Stage 2: Production Dependencies (Chỉ cài thư viện cần cho chạy thật) ---
FROM node:20-slim AS prod-deps

WORKDIR /app

# Cài tool biên dịch vì better-sqlite3 có thể cần build lại native code
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Chỉ cài production dependencies (Bỏ qua devDependencies)
RUN npm ci --omit=dev


# --- Stage 3: Runner (Môi trường chạy tối ưu trên Linux/Ubuntu 22.04) ---
FROM node:20-slim AS runner

WORKDIR /app

# Chỉ cài đặt tsx toàn cục để chạy TypeScript (.ts)
RUN npm install -g tsx && npm cache clean --force

# Sao chép các thư viện đã được tối ưu từ stage prod-deps
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./

# Sao chép kết quả đã build từ frontend và source backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Tối ưu Linux: Tạo cấu trúc cho Database
RUN mkdir -p /app/data

# Set cấu hình biến môi trường Production
ENV NODE_ENV=production
ENV PORT=5000
ENV TZ=Asia/Ho_Chi_Minh

# Mở Port chạy service
EXPOSE 5000

# Chạy bằng User mặc định (root) để tránh lỗi phân quyền SQLite trên Ubuntu
# Lệnh khởi chạy server Node.js thông qua tsx
CMD ["tsx", "server.ts"]
