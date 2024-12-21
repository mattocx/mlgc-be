# Gunakan image Node.js resmi
FROM node:22.11.0

# Tetapkan direktori kerja
WORKDIR /usr/src/app

# Salin file package
COPY package*.json ./

# Instal dependensi
RUN npm install

# Salin seluruh kode proyek
COPY . .

# Expose port
EXPOSE 8000

# Perintah menjalankan aplikasi
CMD ["npm", "start"]