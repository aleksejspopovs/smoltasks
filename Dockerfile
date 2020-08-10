# using postgres as a build container is a funny choice,
# but it's easier to install rust into it than it is to install
# postgres into the rust one.
FROM postgres:12-alpine as builder

# install rust
RUN apk add --no-cache curl openssl-dev build-base pkgconfig
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

# follow https://alexbrand.dev/post/how-to-package-rust-applications-into-minimal-docker-containers/
# to cache build dependencies
WORKDIR /usr/src
RUN USER=root cargo new smoltasks
WORKDIR /usr/src/smoltasks

# build just the dependencies
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release

# copy over db schema and build
COPY migrations/00-initialize/up.sql /docker-entrypoint-initdb.d/00-up.sql
COPY docker-build-with-postgres.sh .
COPY src ./src
RUN ./docker-build-with-postgres.sh

# great, done building, let's assemble the actual container
FROM alpine:latest
COPY --from=builder /root/.cargo/bin/serve /usr/local/bin/serve
COPY web_client /usr/www/web_client
ENV CLIENT_PATH /usr/www/web_client
ENV BIND_ADDR 0.0.0.0:3030
EXPOSE 3030/tcp
CMD ["serve"]
