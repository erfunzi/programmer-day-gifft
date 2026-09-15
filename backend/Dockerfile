FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home app && chmod +x entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 8000
CMD ["./entrypoint.sh", "production"]
