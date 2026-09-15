#!/bin/sh
set -eu
case "${1:-production}" in
  dev) exec python manage.py runserver 0.0.0.0:8000 ;;
  production) exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers "${WEB_WORKERS:-2}" --timeout 150 ;;
  worker) exec celery -A config.celery:app worker --loglevel=info ;;
  beat) exec celery -A config.celery:app beat --loglevel=info --schedule=/tmp/celerybeat-schedule ;;
  *) exec "$@" ;;
esac
