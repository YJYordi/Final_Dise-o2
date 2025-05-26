FROM nginx:alpine

# Instalar ImageMagick para convertir imágenes
RUN apk add --no-cache imagemagick

# Copiar los archivos estáticos
COPY . /usr/share/nginx/html/

# Convertir user.png a favicon.ico
RUN convert /usr/share/nginx/html/img/user.png -resize 32x32 /usr/share/nginx/html/img/favicon.ico

# Copiar la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 