#!/usr/bin/env sh

export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="whatever"
export POSTGRES_HOST_AUTH_METHOD="trust"

# run postgres
/usr/local/bin/docker-entrypoint.sh postgres &

# make sure it's running
i=0
while ! pg_isready -U $POSTGRES_USER ; do
	echo cannot connect to postgres yet

	i=$((i+1))
	if [ $i -ge 3 ] ; then
		echo giving up
		exit 1
	fi

	sleep 2
done

# build smoltasks with access to postgres
export DATABASE_URL="postgresql://$POSTGRES_USER@localhost/$POSTGRES_USER"
cargo install --locked --path .
