FROM nginx:alpine

RUN mkdir -p /usr/share/nginx/html/app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY app/ /usr/share/nginx/html/app/
COPY img/ /usr/share/nginx/html/img/
COPY audio/ /usr/share/nginx/html/audio/

CMD ["nginx", "-g", "daemon off;"] 