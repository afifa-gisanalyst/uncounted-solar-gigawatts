# =========================================================
# Stage 1: Build the React/Vite application
# =========================================================

FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Create the production build
RUN npm run build


# =========================================================
# Stage 2: Serve the production build with Nginx
# =========================================================

FROM nginx:alpine

# Remove the default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy our React production build into Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]