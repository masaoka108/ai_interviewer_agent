FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Create recordings directory with proper permissions
RUN mkdir -p /app/recordings && chmod 755 /app/recordings

COPY . .

EXPOSE 8000

# Add the current directory to PYTHONPATH
ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 