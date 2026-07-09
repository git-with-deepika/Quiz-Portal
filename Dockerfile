FROM nginx:alpine
# remove default nginx site config add our
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static site (HTML/CSS/JS/icons/quizzes) into nginx's web root.
# backend/ is intentionally excluded via .dockerignore.
COPY . /usr/share/nginx/html

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]